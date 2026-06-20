import { Resend } from "resend";

// Placeholder sender - Resend's shared sandbox domain. Swap for a verified Soothly domain
// (e.g. "Soothly <hello@soothly.app>") once DNS is set up.
const FROM = "Soothly <onboarding@resend.dev>";

const SUBJECT = "הספר שלך מוכן לקריאה";

// Escape interpolated values before they land in the HTML body / href - name and url
// come from outside this module, so we never trust them raw.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(name: string, url: string): string {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(url);

  return `<!doctype html>
<html dir="rtl" lang="he">
  <body style="margin:0;padding:0;background-color:#f7f3ec;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ec;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#fffdf8;border-radius:16px;padding:40px 36px;direction:rtl;text-align:right;font-family:Georgia,'Times New Roman',serif;color:#2b2620;">
            <tr>
              <td>
                <h1 style="margin:0 0 24px;font-size:26px;font-weight:normal;color:#2b2620;">הספר שלך מוכן</h1>
                <p style="margin:0 0 16px;font-size:17px;line-height:1.8;">שלום ${safeName},</p>
                <p style="margin:0 0 16px;font-size:17px;line-height:1.8;">עברנו על התשובות שלך והפכנו אותן לספר אישי - אוסף של דפוסים, תובנות ולקחים מתוך הסיפור שלך. הוא מוכן עכשיו ומחכה לך.</p>
                <p style="margin:0 0 28px;font-size:17px;line-height:1.8;">קחו את הזמן. אפשר לפתוח אותו כאן:</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                  <tr>
                    <td style="border-radius:999px;background-color:#b08a3e;">
                      <a href="${safeUrl}" style="display:inline-block;padding:14px 34px;font-size:17px;color:#fffdf8;text-decoration:none;font-family:Georgia,'Times New Roman',serif;">לקריאת הספר</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#6b6358;">אם הכפתור לא נפתח, אפשר להעתיק את הקישור הזה לדפדפן:</p>
                <p style="margin:0 0 28px;font-size:14px;line-height:1.7;word-break:break-all;"><a href="${safeUrl}" style="color:#b08a3e;">${safeUrl}</a></p>
                <p style="margin:0;font-size:17px;line-height:1.8;">בחום,<br />צוות Soothly</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildText(name: string, url: string): string {
  return [
    `שלום ${name},`,
    "",
    "עברנו על התשובות שלך והפכנו אותן לספר אישי - אוסף של דפוסים, תובנות ולקחים מתוך הסיפור שלך. הוא מוכן עכשיו ומחכה לך.",
    "",
    "קחו את הזמן. אפשר לפתוח אותו כאן:",
    url,
    "",
    "בחום,",
    "צוות Soothly",
  ].join("\n");
}

export async function sendReviewLink({
  to,
  name,
  url,
}: {
  to: string;
  name: string;
  url: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set - cannot send the review-link email.");
  }

  // Constrain the link scheme at the boundary - escaping stops markup injection but not a
  // javascript:/data: payload or an off-site phishing link riding in on a trusted Soothly email.
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid review-link URL.");
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("Unsupported URL scheme for the review link - expected http or https.");
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: SUBJECT,
    html: buildHtml(name, url),
    text: buildText(name, url),
  });

  if (error) {
    throw new Error(`Resend failed to send the review-link email: ${error.message}`);
  }
  if (!data) {
    throw new Error("Resend returned no data for the review-link email.");
  }
}
