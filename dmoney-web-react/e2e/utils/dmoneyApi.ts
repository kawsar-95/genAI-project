import { type APIRequestContext, type Page, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:5000';
const SECRET_KEY = process.env.SECRET_KEY || 'ROADTOSDET';

/** JWT of the user logged in on `page` (the app keeps it in localStorage). */
export async function sessionToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  if (!token) throw new Error('No session token in localStorage — is the user logged in?');
  return token;
}

/** Wallet balance of any account; readable by every logged-in role. */
export async function getBalance(request: APIRequestContext, token: string, phoneNumber: string): Promise<number> {
  const res = await request.get(`${API_URL}/transaction/balance/${phoneNumber}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-AUTH-SECRET-KEY': SECRET_KEY },
  });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()).balance;
}
