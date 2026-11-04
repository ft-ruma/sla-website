import "server-only";
import type { Dict } from "./dict/en";
import { fill } from "./i18n";

export type CodePurpose = "setup" | "reset";

/**
 * Sends a one-time code through the Mailjet Send API (v3.1). Without keys,
 * development prints the code instead and production refuses.
 */
export async function sendCode(to: string, code: string, purpose: CodePurpose, t: Dict): Promise<boolean> {
  const key = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  const from = process.env.MAIL_FROM_EMAIL;
  if (!key || !secretKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[member sign-in] ${purpose} code for ${to}: ${code}`);
      return true;
    }
    console.error("member sign-in: MAILJET_API_KEY, MAILJET_SECRET_KEY and MAIL_FROM_EMAIL must be set to send codes");
    return false;
  }
  const subject = purpose === "reset" ? t.codeResetSubject : t.codeEmailSubject;
  const text = fill(purpose === "reset" ? t.codeResetBody : t.codeEmailBody, { code });
  try {
    const res = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:${secretKey}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: from, Name: process.env.MAIL_FROM_NAME || "Sri Lanka Athletics" },
          To: [{ Email: to }],
          Subject: subject,
          TextPart: text,
          CustomID: `sla-${purpose}-code`,
        }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("member sign-in: Mailjet refused the email", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("member sign-in: Mailjet request failed", (e as Error).message);
    return false;
  }
}
