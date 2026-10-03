import { APIRequestContext, expect } from '@playwright/test';
import { ADMIN, PORTAL_API } from './test-data';

export interface PortalUser {
  id: number;
  email: string;
  status: string;
  balance: number;
  otp: string | null;
  otp_expire: string | null;
  reset_token: string | null;
}

/**
 * The portal e-mails the login OTP and the password-reset link to a Gmail inbox, which a test cannot read.
 * The Admin user-lookup endpoint returns both values on the user record, so the suite reads them from there
 * instead of from a mailbox. The UI steps around them (OTP form, reset form) are still driven through the browser.
 */
async function adminToken(api: APIRequestContext): Promise<string> {
  const res = await api.post(`${PORTAL_API}/user/login`, { data: ADMIN });
  expect(res.ok(), 'admin API login').toBeTruthy();
  return (await res.json()).token as string;
}

export async function findUserByEmail(api: APIRequestContext, email: string): Promise<PortalUser> {
  const token = await adminToken(api);
  const res = await api.get(`${PORTAL_API}/user/search/email/${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `lookup of ${email}`).toBeTruthy();
  return (await res.json()).user as PortalUser;
}

/** Waits for a fresh OTP (one that differs from `previous`, the last pair this run already used). */
export async function waitForOtp(api: APIRequestContext, email: string, previous = ''): Promise<{ code: string; stamp: string }> {
  let found = { code: '', stamp: '' };
  await expect
    .poll(
      async () => {
        const u = await findUserByEmail(api, email);
        found = { code: u.otp ?? '', stamp: `${u.otp}|${u.otp_expire}` };
        return Boolean(u.otp) && found.stamp !== previous;
      },
      { message: `OTP for ${email}`, timeout: 20_000, intervals: [500, 1000] },
    )
    .toBe(true);
  return found;
}

export async function waitForResetToken(api: APIRequestContext, email: string): Promise<string> {
  let token = '';
  await expect
    .poll(
      async () => {
        token = (await findUserByEmail(api, email)).reset_token ?? '';
        return token.length;
      },
      { message: `reset token for ${email}`, timeout: 20_000, intervals: [500, 1000] },
    )
    .toBeGreaterThan(0);
  return token;
}

export interface CustomerPick {
  phone: string;
  balance: number;
}

/**
 * The portal caps a customer wallet (about 10,000 Tk) and rejects deposits above the remaining room, so a
 * hard-coded customer eventually fills up on this shared environment. Picks the oldest active Customer whose
 * balance leaves at least `headroom` Tk free.
 */
export async function findCustomerWithRoom(api: APIRequestContext, headroom = 5000): Promise<CustomerPick> {
  const token = await adminToken(api);
  const res = await api.get(`${PORTAL_API}/user/list?count=1000&page=1&order=asc`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), 'user list').toBeTruthy();
  const users = (await res.json()).users as Array<PortalUser & { role: string; phone_number: string }>;
  const match = users.find(
    (u) => u.role === 'Customer' && u.status === 'active' && Number(u.balance) <= 10_000 - headroom,
  );
  expect(match, `an active Customer with at least ${headroom} Tk of headroom`).toBeTruthy();
  return { phone: match!.phone_number, balance: Number(match!.balance) };
}
