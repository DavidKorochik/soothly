// Re-render the landing preview to PNGs. Run from repo root:
//   node docs/landing/shoot.mjs
// (uses the project's local puppeteer; --no-sandbox for headless/CI environments)
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const url = "file://" + path.join(dir, "landing-preview.html");

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });

async function shoot(width, tag) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  // force every scroll-reveal visible so the full-page shot shows all sections
  await page.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("in")));
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(dir, `preview-${tag}.png`), fullPage: true });
  await page.close();
  console.log("shot", tag);
}

await shoot(1280, "desktop");
await shoot(390, "mobile");
await browser.close();
console.log("done");
