// Reads the dMoney login OTP from Gmail via the Gmail REST API.
// Needs GMAIL_ACCESS_TOKEN (OAuth token with gmail.readonly scope) in e2e/.env.

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const OTP_SUBJECT = 'DMoney — Your Login OTP';
// Body sent by dmoney-transaction-api: "...for DMoney login is:\n\n  1234\n\n..."
const OTP_PATTERN = /login is:\s*(\d{4})\b/;
// Backend sets otp_expire = now + 2 minutes when it sends the mail.
export const OTP_VALIDITY_MS = 2 * 60_000;
// Don't use an OTP that would expire before we can type and submit it.
const EXPIRY_BUFFER_MS = 10_000;

interface MessagePart {
  mimeType?: string;
  body?: { data?: string };
  parts?: MessagePart[];
}

interface GmailMessage {
  id: string;
  internalDate: string; // epoch ms, as a string
  snippet?: string;
  payload?: MessagePart;
}

export interface OtpEmail {
  id: string;
  otp: string;
  receivedAt: Date;
}

function authHeaders() {
  const token = process.env.GMAIL_ACCESS_TOKEN;
  if (!token) throw new Error('GMAIL_ACCESS_TOKEN is not set (expected in e2e/.env)');
  return { Authorization: `Bearer ${token}` };
}

async function gmailGet<T>(path: string): Promise<T> {
  const res = await fetch(`${GMAIL_API}${path}`, { headers: authHeaders() });
  if (res.status === 401) throw new Error('Gmail rejected GMAIL_ACCESS_TOKEN (401) — it is expired or invalid');
  if (!res.ok) throw new Error(`Gmail GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Get mail list: ids of the newest messages matching a Gmail search query. */
export async function listMessageIds(query: string, maxResults = 5): Promise<string[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  const data = await gmailGet<{ messages?: { id: string }[] }>(`/messages?${params}`);
  return (data.messages ?? []).map((m) => m.id);
}

/** Read mail by message ID. */
export async function getMessage(id: string): Promise<GmailMessage> {
  return gmailGet<GmailMessage>(`/messages/${id}?format=full`);
}

/** Plain-text body of a message, falling back to the snippet. */
export function getMessageText(message: GmailMessage): string {
  const texts: string[] = [];
  const walk = (part?: MessagePart) => {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data) {
      texts.push(Buffer.from(part.body.data, 'base64url').toString('utf8'));
    }
    part.parts?.forEach(walk);
  };
  walk(message.payload);
  return texts.join('\n') || message.snippet || '';
}

export function extractOtp(text: string): string | null {
  return text.match(OTP_PATTERN)?.[1] ?? null;
}

/** The newest OTP email sent to `to`, whatever its age, or null if there is none. */
export async function findLatestOtpEmail(to: string): Promise<OtpEmail | null> {
  const [latestId] = await listMessageIds(`subject:"${OTP_SUBJECT}" to:${to}`, 1);
  if (!latestId) return null;

  const message = await getMessage(latestId);
  const otp = extractOtp(getMessageText(message));
  if (!otp) throw new Error(`OTP not found in email ${latestId}: "${message.snippet}"`);
  return { id: latestId, otp, receivedAt: new Date(Number(message.internalDate)) };
}

export function isOtpExpired(email: OtpEmail, now = Date.now()): boolean {
  return now >= email.receivedAt.getTime() + OTP_VALIDITY_MS - EXPIRY_BUFFER_MS;
}

/**
 * Polls Gmail until a usable OTP email for `to` arrives and returns it.
 * An email is skipped (and polling continues) when its OTP has expired, or when it was
 * received before `since`: each login overwrites the previous OTP, so an older mail is
 * invalid even inside its 2-minute window. Pass `since` = just before submitting the login form.
 */
export async function waitForFreshOtpEmail({
  to,
  since,
  timeoutMs = 60_000,
  intervalMs = 3_000,
}: {
  to: string;
  since: Date;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<OtpEmail> {
  const deadline = Date.now() + timeoutMs;
  let lastSkippedId: string | undefined;

  while (Date.now() < deadline) {
    const email = await findLatestOtpEmail(to);
    if (email) {
      const expired = isOtpExpired(email);
      const beforeLogin = email.receivedAt < since;
      if (!expired && !beforeLogin) return email;

      if (email.id !== lastSkippedId) {
        const reason = expired ? 'expired' : 'sent before this login';
        console.log(`Skipping OTP email ${email.id} (${email.receivedAt.toISOString()}): ${reason}; waiting for a new one`);
        lastSkippedId = email.id;
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`No new OTP email to ${to} received after ${since.toISOString()} within ${timeoutMs}ms`);
}

/** The 4-digit OTP from the newest usable OTP email. */
export async function getLatestOtp(options: Parameters<typeof waitForFreshOtpEmail>[0]): Promise<string> {
  return (await waitForFreshOtpEmail(options)).otp;
}
