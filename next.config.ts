import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer + chromium ship binaries; keep them out of the bundle.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "puppeteer"],
  // Allow the Base44 preview origin to fetch dev assets / HMR. The platform sets
  // BASE44_PUBLIC_HOST_SUFFIX; the preview origin is 3000-<suffix>.
  allowedDevOrigins: process.env.BASE44_PUBLIC_HOST_SUFFIX
    ? [`3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`]
    : [],
  // The IP prompts/template live in docs/ and are read at runtime — trace them into the function.
  // The self-hosted woff2 are read by a dynamic path (lib/pdf/template.ts) the tracer can't infer,
  // so include the dir explicitly or the prod PDF loses its Hebrew glyphs.
  outputFileTracingIncludes: {
    "/api/synthesize": [
      "./docs/synthesis_prompt_v2.md",
      "./docs/safety_check_prompt.md",
      "./docs/book_template.html",
      "./docs/fonts/**",
    ],
  },
};

export default nextConfig;
