// k6 load test: customers sending money to each other under a staged load.
//
// Load profile (k6 stages, one minute in total):
//   0s–30s   ramp 0 → 3 users
//   30s–50s  7 more users join (3 → 10) and keep transacting
//   50s–60s  all users leave (10 → 0)
//
// Run: k6 run performance/sendmoney-concurrency.k6.js
//
// Uses only existing ACTIVE customers with enough balance, and reuses them: every
// send goes from one of them to another. No users are created. Senders are rotated
// so that no customer exceeds its remaining daily/monthly limit (BRD §8.1), which
// setup works out from each customer's statement. Local/dev only: it uses the dev
// OTP bypass (?env=dev) and writes real ledger rows.

import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter } from 'k6/metrics';

const BASE_URL    = __ENV.BASE_URL    || 'http://localhost:5000';
const SECRET_KEY  = __ENV.SECRET_KEY  || 'ROADTOSDET';
const PASSWORD    = __ENV.PASSWORD    || '1234';      // password of the reused customers
const ADMIN       = __ENV.ADMIN_EMAIL || 'admin@dmoney.com';
const AMOUNT      = Number(__ENV.AMOUNT      || 10);    // minimum send is 10 Tk
const FEE         = Number(__ENV.FEE         || 5);     // flat Send Money fee
const MIN_BALANCE = Number(__ENV.MIN_BALANCE || 1000);  // "enough balance" to be reused
const THINK_TIME  = Number(__ENV.THINK_TIME  || 3);     // seconds between a user's sends

// Customer outgoing limits (BRD §8.1); GET /transaction/limit does not expose them.
const DAILY_COUNT = 10, DAILY_AMOUNT = 5000, MONTHLY_COUNT = 50, MONTHLY_AMOUNT = 50000;
const OUTGOING = ['SendMoney', 'Payment', 'Withdraw'];

const STAGES = [
    { duration: '30s', target: 3 },
    { duration: '20s', target: 10 },
    { duration: '10s', target: 0 },
];

const sendmoneySuccess = new Counter('sendmoney_success');
const sendmoneySkipped = new Counter('sendmoney_skipped');

export const options = {
    setupTimeout: '2m',
    stages: STAGES,
    thresholds: {
        'checks{name:sendmoney}': ['rate==1'],
        'http_req_failed{name:sendmoney}': ['rate==0'],
        'http_req_duration{name:sendmoney}': ['max<60000'],
        // Fails the run if the reusable customers ran out of limit or balance.
        sendmoney_skipped: ['count==0'],
    },
};

const json = { 'Content-Type': 'application/json' };
const auth = (token) => ({ ...json, Authorization: `Bearer ${token}`, 'X-AUTH-SECRET-KEY': SECRET_KEY });

function directLogin(email) {
    const res = http.post(`${BASE_URL}/user/login`, JSON.stringify({ email, password: PASSWORD }), { headers: json });
    if (res.status !== 200 || !res.json('token')) fail(`login failed for ${email}: ${res.status} ${res.body}`);
    return res.json('token');
}

function otpLogin(email) {
    const login = http.post(`${BASE_URL}/user/login`, JSON.stringify({ email, password: PASSWORD }), { headers: json });
    if (login.status !== 200) return null;
    const res = http.post(`${BASE_URL}/user/verify-otp?env=dev`, JSON.stringify({ identifier: email, otp: '0000' }), { headers: json });
    return res.status === 200 ? res.json('token') : null;
}

// Outgoing usage since `since`, counted the way limitChecker.js counts it.
function usageSince(rows, since) {
    const ids = new Set();
    let amount = 0;
    for (const r of rows) {
        if (Number(r.debit) > 0 && OUTGOING.includes(r.transaction_type) && new Date(r.createdAt) >= since) {
            ids.add(r.trnxId);
            amount += Number(r.debit);
        }
    }
    return { count: ids.size, amount };
}

// Approximate VU-seconds of the stages, to estimate how many sends the run will make.
function estimatedIterations() {
    let prev = 0, vuSeconds = 0;
    for (const s of STAGES) {
        const secs = parseInt(s.duration, 10);
        vuSeconds += secs * (prev + s.target) / 2;
        prev = s.target;
    }
    return Math.ceil(vuSeconds / THINK_TIME);
}

export function setup() {
    const adminToken = directLogin(ADMIN);
    const list = http.get(`${BASE_URL}/user/list?count=1000`, { headers: auth(adminToken) });
    if (list.status !== 200) fail(`user list failed: ${list.status}`);

    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const perSend = AMOUNT + FEE;

    const customers = [];
    for (const u of list.json('users')) {
        if (u.role !== 'Customer' || u.status !== 'active' || Number(u.balance) < MIN_BALANCE) continue;

        const st = http.get(`${BASE_URL}/transaction/statement/${u.phone_number}?count=500`, { headers: auth(adminToken) });
        if (st.status !== 200) continue;
        const rows = st.json('transactions');
        const day = usageSince(rows, dayStart);
        const month = usageSince(rows, monthStart);

        const capacity = Math.max(0, Math.min(
            DAILY_COUNT - day.count,
            MONTHLY_COUNT - month.count,
            Math.floor((DAILY_AMOUNT - day.amount) / perSend),
            Math.floor((MONTHLY_AMOUNT - month.amount) / perSend),
            Math.floor(Number(u.balance) / perSend),
        ));
        if (capacity === 0) continue;

        const token = otpLogin(u.email);
        if (!token) { console.warn(`skipping ${u.phone_number}: login failed`); continue; }
        customers.push({ phone: u.phone_number, token, capacity, balance: Number(u.balance) });
    }
    if (customers.length < 2) fail(`need at least 2 active customers with >= ${MIN_BALANCE} Tk and limit left; found ${customers.length}`);

    // Round-robin slots: consecutive sends come from different customers, each one
    // used at most `capacity` times, always paying the next customer in the list.
    const slots = [];
    const maxCap = Math.max(...customers.map((c) => c.capacity));
    for (let round = 0; round < maxCap; round++) {
        customers.forEach((c, i) => {
            if (round < c.capacity) slots.push({ from: i, to: (i + 1) % customers.length });
        });
    }

    const expected = estimatedIterations();
    console.log(`customers=${customers.length} [${customers.map((c) => `${c.phone}:${c.capacity}`).join(', ')}]`);
    console.log(`send capacity=${slots.length}, estimated sends=${expected} (think time ${THINK_TIME}s)`);
    if (slots.length < expected) console.warn('capacity is below the estimated sends; increase THINK_TIME or MIN_BALANCE pool');

    return { customers: customers.map(({ phone, token }) => ({ phone, token })), slots };
}

export default function (data) {
    const k = exec.scenario.iterationInTest;
    const slot = data.slots[k];
    if (!slot) {
        sendmoneySkipped.add(1);
        sleep(THINK_TIME);
        return;
    }
    const sender = data.customers[slot.from];
    const receiver = data.customers[slot.to];

    const res = http.post(`${BASE_URL}/transaction/sendmoney`, JSON.stringify({
        from_account: sender.phone, to_account: receiver.phone, amount: AMOUNT,
    }), { headers: auth(sender.token), tags: { name: 'sendmoney' } });

    const ok = check(res, {
        'status is 201': (r) => r.status === 201,
        'send money successful': (r) => r.status === 201 && r.json('message') === 'Send money successful',
    }, { name: 'sendmoney' });

    if (ok) sendmoneySuccess.add(1);
    else console.error(`send #${k} ${sender.phone} -> ${receiver.phone}: ${res.status} ${res.body}`);

    sleep(THINK_TIME);
}
