import nodemailer from "nodemailer";

/**
 * Deliver the briefing PDF to your Kindle from YOUR OWN Gmail address.
 *
 * Why this works for personal use:
 *  - You add your own Gmail address to Amazon's Approved Personal Document
 *    Senders list (one-time, takes 30 seconds)
 *  - No custom domain, no Resend, no deliverability worries
 *
 * Setup:
 *  1. Google Account → Security → 2-Step Verification → App passwords
 *  2. Create one named "intermission" → put it in .env as GMAIL_APP_PASSWORD
 *  3. amazon.co.uk → Manage Your Content and Devices → Preferences →
 *     Personal Document Settings → add your Gmail address as approved sender
 *
 * IMPORTANT: we send the PDF as-is (no "Convert" subject). "Convert"
 * tells Amazon to reflow the PDF into Kindle format, which destroys the
 * designed layout (columns, drop caps, typography). The PDF page is
 * already sized to the Kindle screen, so it renders 1:1 without zooming.
 */
export async function sendBriefingToKindle(opts: {
  kindleEmail: string;
  pdfBuffer: Buffer;
  filename: string;
  convertToNative?: boolean;
}): Promise<void> {
  const { kindleEmail, pdfBuffer, filename, convertToNative = false } = opts;

  const user = process.env.GMAIL_ADDRESS;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_ADDRESS and GMAIL_APP_PASSWORD must be set in .env");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: user,
    to: kindleEmail,
    subject: convertToNative ? "Convert" : filename,
    text: "Your daily briefing is attached.",
    attachments: [{ filename, content: pdfBuffer }],
  });
}
