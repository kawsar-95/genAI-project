const { Transactions } = require('../../sequelizeModel/Transactions');
const { Users } = require('../../sequelizeModel/Users');
const { Commission } = require('../../sequelizeModel/Commission');
const { getBalance } = require('../../services/getBalance');
const { checkCustomerLimits } = require('../../services/limitChecker');
const { generateTrnxId } = require('../../services/generateTrnxId');
const { sequelize } = require('../../sequelizeModel/db');
const { Transaction } = require('sequelize');

// Plain decimal with at most 2 places (BDT). Rejects hex ("0x10"), exponent ("1e1"),
// arrays ([20]) and sub-paisa amounts (10.555) that Number() would otherwise accept.
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

exports.handleSendMoney = async (req, res, next) => {
    try {
        return await sendMoney(req, res);
    } catch (err) {
        // Never let a rejected promise escape: Express 4 does not catch async errors,
        // and an unhandled rejection would terminate the whole API process.
        console.error('SendMoney error:', err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

async function sendMoney(req, res) {
    const { amount } = req.body;

    // ── Input validation ─────────────────────────────────────────────────────
    // Both accounts must be non-empty strings. Missing values would reach
    // Users.findOne as `undefined`, and arrays would turn into an IN (...) lookup.
    if (typeof req.body.from_account !== 'string' || !req.body.from_account.trim()) {
        return res.status(400).json({ message: 'from_account is required and must be a string' });
    }
    if (typeof req.body.to_account !== 'string' || !req.body.to_account.trim()) {
        return res.status(400).json({ message: 'to_account is required and must be a string' });
    }
    // Trim so "01686606903 " cannot bypass the same-account check below
    // (the DB collation pads spaces, so lookups would still match the sender).
    const from_account = req.body.from_account.trim();
    const to_account   = req.body.to_account.trim();

    if ((typeof amount !== 'number' && typeof amount !== 'string') ||
        !AMOUNT_PATTERN.test(String(amount).trim())) {
        return res.status(400).json({ message: 'Amount must be a valid number greater than 0 with at most 2 decimal places' });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
        return res.status(400).json({ message: 'Amount must be a valid number greater than 0' });
    }

    const trnxId = generateTrnxId();

    // Load commission rules from DB
    const config    = await Commission.getConfig('SendMoney');
    const feeRule   = config.rules.find(r => r.recipient === 'SYSTEM');
    const p2pFee    = feeRule ? Commission.calcFee(feeRule, amt) : 5;
    const minAmount = config.minTxnAmount || 10;

    const from_account_exists = await Users.findOne({ where: { phone_number: from_account } });
    const to_account_exists   = await Users.findOne({ where: { phone_number: to_account } });

    if (from_account_exists && to_account_exists) {
        // ── Authorization: the token owner must be the from_account holder ────
        // req.user.identifier is the email or phone_number used at login.
        // We match it against both fields of the from_account user record so that
        // a token issued for any user cannot be used to transact from another account.
        const authIdentifier = req.user.identifier;
        if (from_account_exists.getDataValue('phone_number') !== authIdentifier &&
            from_account_exists.getDataValue('email') !== authIdentifier) {
            return res.status(403).json({
                message: "Unauthorized: you can only initiate transactions from your own account"
            });
        }

        // Compare the resolved users, not the request strings: the DB collation
        // (utf8mb4_unicode_ci) matches look-alike spellings, such as a trailing
        // zero-width space or full-width digits, to the same user.
        if (from_account_exists.getDataValue('id') === to_account_exists.getDataValue('id')) {
            return res.status(400).json({ message: "From account and to account cannot be the same" });
        }

        // Use the stored phone numbers from here on, so the lock, the limit check
        // and the ledger rows never carry a look-alike spelling of the account.
        const fromPhone = from_account_exists.getDataValue('phone_number');
        const toPhone   = to_account_exists.getDataValue('phone_number');

        // Status checks — both accounts must be active
        if (from_account_exists.getDataValue('status') !== 'active') {
            return res.status(403).json({ message: "Your account is not active. Please contact admin." });
        }
        if (to_account_exists.getDataValue('status') !== 'active') {
            return res.status(403).json({ message: "Receiver account is not active. Please contact admin." });
        }

        const fromRole = from_account_exists.getDataValue('role');
        const toRole   = to_account_exists.getDataValue('role');

        if (fromRole === "Customer" && toRole === "Customer") {

            // ── Minimum amount check (no DB needed — do it before the transaction) ──
            if (amt < minAmount) {
                return res.status(400).json({ message: `Minimum amount is ${minAmount} tk` });
            }

            try {
                // ── Atomic balance check + ledger writes ─────────────────────
                // READ_COMMITTED + FOR UPDATE ensures:
                //   1. No concurrent request reads the same balance before this debit commits
                //   2. All 3 inserts succeed or all roll back together (no partial writes)
                await sequelize.transaction(
                    { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
                    async (t) => {
                        // Locked balance read — blocks concurrent requests on this account
                        const balanceRows = await sequelize.query(
                            'SELECT COALESCE(SUM(`credit`) - SUM(`debit`), 0) AS Balance FROM Transactions WHERE `account` = ? FOR UPDATE',
                            { replacements: [fromPhone], transaction: t, type: sequelize.QueryTypes.SELECT }
                        );
                        const currentBalance = parseFloat(balanceRows[0].Balance) || 0;

                        // ── Daily / Monthly limit check ──────────────────────
                        // Runs after the FOR UPDATE lock so concurrent outgoing
                        // transactions from the same account (SendMoney, Payment,
                        // Withdraw all take this lock first) are serialized and each one
                        // sees the others' committed debits (READ_COMMITTED re-snapshots
                        // per statement). Checked before the balance, as BRD §8.3 requires.
                        // Pass the full debit (amount + fee) so the check uses the same
                        // basis as the historical SUM(debit) query in limitChecker.js.
                        const limitCheck = await checkCustomerLimits(fromPhone, amt + p2pFee, { transaction: t });
                        if (!limitCheck.allowed) {
                            const err = new Error('LIMIT_EXCEEDED');
                            err.limitCheck = limitCheck;
                            throw err;
                        }

                        if (currentBalance <= 0 || amt + p2pFee > currentBalance) {
                            // Throw to trigger automatic rollback
                            const err = new Error('INSUFFICIENT_BALANCE');
                            err.balance = currentBalance;
                            throw err;
                        }

                        const debitTrnx = {
                            account:          fromPhone,
                            from_account:     fromPhone,
                            to_account:       toPhone,
                            description:      "Send Money",
                            trnxId:           trnxId,
                            debit:            amt + p2pFee,
                            credit:           0,
                            transaction_type: 'SendMoney'
                        };
                        const creditTrnx = {
                            account:          toPhone,
                            from_account:     fromPhone,
                            to_account:       toPhone,
                            description:      "Send Money",
                            trnxId:           trnxId,
                            debit:            0,
                            credit:           amt,
                            transaction_type: 'SendMoney'
                        };
                        const creditTrnxToSystem = {
                            account:          "SYSTEM",
                            from_account:     fromPhone,
                            to_account:       "SYSTEM",
                            description:      "Sendmoney Service Charge",
                            trnxId:           trnxId,
                            debit:            0,
                            credit:           p2pFee,
                            transaction_type: 'SendMoney'
                        };

                        // All 3 writes are atomic — they all commit or all roll back
                        await Transactions.create(debitTrnx,          { transaction: t });
                        await Transactions.create(creditTrnx,         { transaction: t });
                        await Transactions.create(creditTrnxToSystem, { transaction: t });
                    }
                );

                return res.status(201).json({
                    message:        "Send money successful",
                    trnxId:         trnxId,
                    fee:            p2pFee,
                    currentBalance: await getBalance(fromPhone)
                });

            } catch (err) {
                if (err.message === 'INSUFFICIENT_BALANCE') {
                    return res.status(208).json({
                        message:        "Insufficient balance",
                        currentBalance: err.balance
                    });
                }
                if (err.message === 'LIMIT_EXCEEDED') {
                    return res.status(400).json({
                        message: err.limitCheck.message,
                        details: err.limitCheck.details
                    });
                }
                console.error('SendMoney transaction error:', err);
                return res.status(500).json({ message: "Internal server error" });
            }

        } else {
            return res.status(400).json({ message: "Send money is only allowed between two Customer accounts" });
        }
    } else {
        if (!from_account_exists) {
            return res.status(404).json({ message: "From Account does not exist" });
        } else {
            return res.status(404).json({ message: "To Account does not exist" });
        }
    }
}


