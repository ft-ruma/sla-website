import "server-only";
import type { Dict } from "./dict/en";
import { fill } from "./i18n";

export type CodePurpose = "setup" | "reset";

type MailjetSendResponse = {
  Messages?: Array<{
    Status?: string;
    Errors?: Array<{ ErrorCode?: string; ErrorMessage?: string; ErrorIdentifier?: string }>;
    To?: Array<{ Email?: string; MessageUUID?: string; MessageID?: number }>;
  }>;
};

/**
 * Sends a one-time code through the Mailjet Send API (v3.1). Without keys,
 * development prints the code instead and production refuses.
 *
 * Mailjet often returns HTTP 200 even when a message failed. We only treat
 * Status === "success" as delivered.
 */
export async function sendCode(to: string, code: string, purpose: CodePurpose, t: Dict): Promise<boolean> {
  const key = process.env.MAILJET_API_KEY?.trim();
  const secretKey = process.env.MAILJET_SECRET_KEY?.trim();
  const from = process.env.MAIL_FROM_EMAIL?.trim();
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
  const html = `<p>${text.replace(/\n/g, "<br/>")}</p>`;
  try {
    const res = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:${secretKey}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: from, Name: process.env.MAIL_FROM_NAME?.trim() || "Sri Lanka Athletics" },
          To: [{ Email: to }],
          Subject: subject,
          TextPart: text,
          HTMLPart: html,
          CustomID: `sla-${purpose}-code`,
        }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => null)) as MailjetSendResponse | null;
    const message = body?.Messages?.[0];
    if (!res.ok) {
      console.error("member sign-in: Mailjet refused the email", res.status, JSON.stringify(body));
      return false;
    }
    if (message?.Status !== "success") {
      console.error(
        "member sign-in: Mailjet did not accept the message",
        message?.Status ?? "missing-status",
        JSON.stringify(message?.Errors ?? body),
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error("member sign-in: Mailjet request failed", (e as Error).message);
    return false;
  }
}
