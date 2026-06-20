import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer + chromium ship binaries; keep them out of the bundle.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "puppeteer"],
  // The IP prompts/template live in docs/ and are read at runtime — trace them into the function.
  outputFileTracingIncludes: {
    "/api/synthesize": [
      "./docs/synthesis_prompt_v2.md",
      "./docs/safety_check_prompt.md",
      "./docs/book_template.html",
    ],
  },
};

export default nextConfig;
