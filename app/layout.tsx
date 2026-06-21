import type { Metadata, Viewport } from "next";
import { Frank_Ruhl_Libre, Heebo } from "next/font/google";
import "./globals.css";

const frank = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-frank",
});

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-heebo",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const DESCRIPTION = "ספר אישי - הסיפור שלך, כפי שנראה מבחוץ.";

// Icons (favicon.ico, icon.svg, apple-icon.png) and the social card (opengraph-image.png,
// twitter-image.png) are wired up automatically from their files in app/.
export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Soothly", template: "%s · Soothly" },
  description: DESCRIPTION,
  applicationName: "Soothly",
  appleWebApp: { capable: true, title: "Soothly", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "Soothly",
    title: "Soothly",
    description: DESCRIPTION,
    locale: "he_IL",
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "Soothly", description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ec",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${frank.variable} ${heebo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
