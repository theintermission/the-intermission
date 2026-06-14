/**
 * One-time Gmail authorization.
 * ─────────────────────────────
 * Run: npm run gmail:auth
 *
 * Opens a browser to Google's consent screen, catches the redirect on
 * localhost:8123, exchanges the code, and prints your refresh token.
 * Paste that into .env (and GitHub Secrets for CI).
 *
 * Prerequisite (one-time, ~10 min):
 *  1. console.cloud.google.com → create a project ("quiet-personal")
 *  2. APIs & Services → Enable "Gmail API"
 *  3. OAuth consent screen → External → add yourself as a test user
 *     (stays in "testing" mode forever — fine for personal use*)
 *  4. Credentials → Create OAuth client ID → Desktop app
 *  5. Put client ID + secret in .env
 *
 *  * Note: Google expires refresh tokens for apps in "testing" mode after
 *    7 days. To avoid re-authing weekly, publish the app (it can remain
 *    unverified for your own use — you'll just see a warning screen once).
 */

import "dotenv/config";
import http from "node:http";
import { google } from "googleapis";

const PORT = 8123;
const REDIRECT = `http://localhost:${PORT}/callback`;

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.");
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh token issuance
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });

  console.log("\nOpen this URL in your browser:\n");
  console.log(authUrl);
  console.log("\nWaiting for callback on localhost:8123…\n");

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${PORT}`);
      if (url.pathname !== "/callback") return;
      const code = url.searchParams.get("code");
      if (code) {
        res.end("Authorized. You can close this tab and return to the terminal.");
        server.close();
        resolve(code);
      } else {
        res.end("No code in callback.");
        server.close();
        reject(new Error("OAuth callback had no code"));
      }
    });
    server.listen(PORT);
  });

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.error("No refresh token returned. Remove the app's access at myaccount.google.com/permissions and try again.");
    process.exit(1);
  }

  console.log("\n✓ Success. Add this to your .env (and GitHub Secrets):\n");
  console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  console.log("Then set gmail.enabled = true in quiet.config.ts");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
