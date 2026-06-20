import type { Browser } from "puppeteer-core";

// Reuse one browser across warm invocations (cold start launches Chromium once).
let browserPromise: Promise<Browser> | null = null;

async function launch(): Promise<Browser> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = await import("puppeteer-core");
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  // Local dev: full puppeteer ships its own Chromium.
  const puppeteer = await import("puppeteer");
  return puppeteer.launch({ headless: true }) as unknown as Browser;
}

export function getBrowser(): Promise<Browser> {
  return (browserPromise ??= launch());
}
