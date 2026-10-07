// Seeded accounts from dmoney-transaction-api/sequelizeModel/Users.js; override via e2e/.env.
export const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@dmoney.com',
  password: process.env.ADMIN_PASSWORD || '1234',
};

// The OTP is only emailed to @gmail.com addresses, and must land in the mailbox GMAIL_ACCESS_TOKEN reads.
export const AGENT = {
  email: process.env.AGENT_EMAIL || 'salmansrabon+agent@gmail.com',
  password: process.env.AGENT_PASSWORD || '1234',
};

// Must be an active Customer whose wallet has room under the 10,000 tk cap.
export const CUSTOMER = {
  phone: process.env.CUSTOMER_PHONE || '01686606902',
};
