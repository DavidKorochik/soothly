import type { Book } from "../synthesis/parse";
import { buildHtml } from "./template";
import { getBrowser } from "./browser";

export async function renderPdf(book: Book, name: string): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(buildHtml(book, name), { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready"); // wait for Hebrew web fonts before printing
    return await page.pdf({ printBackground: true, preferCSSPageSize: true });
  } finally {
    await page.close();
  }
}
