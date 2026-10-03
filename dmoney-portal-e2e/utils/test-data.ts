export const PORTAL_API = 'https://dmoney.roadtocareer.net';

export const ADMIN = { email: 'admin@dmoney.com', password: '1234' };
export const SYSTEM = { email: 'system@dmoney.com', password: '1234' };

/** Pin the Customer used for the 500 Tk deposit; by default one with enough wallet headroom is looked up at run time. */
export const CUSTOMER_PHONE_OVERRIDE = process.env.CUSTOMER_PHONE;

export const SYSTEM_DEPOSIT_AMOUNT = 2000;
export const CUSTOMER_DEPOSIT_AMOUNT = 500;
/** The agent earns 2.5% commission on a cash-in (500 Tk -> 12.50 Tk). */
export const AGENT_COMMISSION_RATE = 0.025;

export interface AgentUser {
  name: string;
  email: string;
  password: string;
  newPassword: string;
  phone: string;
  nid: string;
}

const digits = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');

/** Registration is unique on email, phone and NID, so every run gets fresh values. */
export function buildAgent(): AgentUser {
  const stamp = Date.now();
  return {
    name: `QA Agent ${stamp}`,
    email: `qa.agent.${stamp}@gmail.com`,
    password: '1234',
    newPassword: '5678',
    phone: `01${digits(9)}`,
    nid: digits(10),
  };
}
