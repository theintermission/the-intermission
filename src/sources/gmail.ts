import { google } from "googleapis";

export type GmailMessage = {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: Date;
};

/**
 * Fetch recent Gmail messages from YOUR account.
 *
 * Personal-mode simplifications vs the consumer app:
 *  - Refresh token comes straight from env (GitHub Secrets in CI)
 *  - No encryption layer needed — secrets manager handles that
 *
 * Privacy stance unchanged: bodies are held in memory, summarized, dropped.
 * Nothing is persisted.
 *
 * Run `npm run gmail:auth` once to obtain GOOGLE_REFRESH_TOKEN.
 */
export async function fetchRecentEmails(opts: {
  maxItems?: number;
  sinceHours?: number;
}): Promise<GmailMessage[]> {
  const { maxItems = 8, sinceHours = 36 } = opts;

  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("GOOGLE_REFRESH_TOKEN not set. Run: npm run gmail:auth");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:8123/callback",
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const cutoffSeconds = Math.floor((Date.now() - sinceHours * 60 * 60 * 1000) / 1000);
  const q = `after:${cutoffSeconds} -category:promotions -category:social in:inbox`;

  const list = await gmail.users.messages.list({ userId: "me", q, maxResults: maxItems });
  if (!list.data.messages) return [];

  const messages = await Promise.all(
    list.data.messages.map(async (m) => {
      const full = await gmail.users.messages.get({ userId: "me", id: m.id!, format: "full" });
      const headers = full.data.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";
      const from = headers.find((h) => h.name === "From")?.value ?? "Unknown";
      const dateStr = headers.find((h) => h.name === "Date")?.value;
      return {
        id: full.data.id!,
        sender: from,
        subject,
        snippet: full.data.snippet ?? "",
        body: extractPlainText(full.data.payload),
        receivedAt: dateStr ? new Date(dateStr) : new Date(),
      } satisfies GmailMessage;
    }),
  );

  return messages;
}

export function extractSenderName(fromHeader: string): string {
  const match = fromHeader.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : fromHeader;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPlainText(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data && payload.mimeType === "text/plain") {
    return Buffer.from(payload.body.data, "base64").toString("utf8");
  }
  if (payload.parts) {
    const plain = payload.parts.find((p: any) => p.mimeType === "text/plain"); // eslint-disable-line
    if (plain?.body?.data) {
      return Buffer.from(plain.body.data, "base64").toString("utf8");
    }
    const html = payload.parts.find((p: any) => p.mimeType === "text/html"); // eslint-disable-line
    if (html?.body?.data) {
      const raw = Buffer.from(html.body.data, "base64").toString("utf8");
      return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
    for (const part of payload.parts) {
      const inner = extractPlainText(part);
      if (inner) return inner;
    }
  }
  return "";
}
