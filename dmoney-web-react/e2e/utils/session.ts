import fs from 'fs';
import path from 'path';

export type Role = 'admin' | 'agent';

// Value the app stores in localStorage 'role' at login.
const ROLE_NAME: Record<Role, string> = { admin: 'Admin', agent: 'Agent' };
// Log in again when the saved JWT has less than this left, so it can't expire mid-run.
const MIN_REMAINING_MS = 10 * 60_000;

/** Storage-state file holding the logged-in session for `role`: e2e/admin_auth.json, e2e/agent_auth.json. */
export function authFile(role: Role): string {
  return path.join(__dirname, '..', `${role}_auth.json`);
}

/** True when `role`'s saved session exists, was logged in as that role, and its JWT is not about to expire. */
export function hasValidSession(role: Role): boolean {
  try {
    const state = JSON.parse(fs.readFileSync(authFile(role), 'utf8'));
    const entries: { name: string; value: string }[] = state.origins.flatMap((o: any) => o.localStorage);
    const storage = Object.fromEntries(entries.map((e) => [e.name, e.value]));
    if (storage.role !== ROLE_NAME[role] || !storage.token) return false;

    const { exp } = JSON.parse(Buffer.from(storage.token.split('.')[1], 'base64url').toString());
    return exp * 1000 - Date.now() > MIN_REMAINING_MS;
  } catch {
    return false; // missing or unreadable file
  }
}

export function roleName(role: Role): string {
  return ROLE_NAME[role];
}
