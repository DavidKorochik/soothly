import type { Metadata, Viewport } from "next";
import { David_Libre, Frank_Ruhl_Libre, Heebo } from "next/font/google";
import "./globals.css";
import ServiceStatusBanner from "./components/ServiceStatusBanner";

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

// David Libre (Ismar David, 1954): a warm, calligraphic Hebrew serif used only at 700 for the
// ceremonial display lines — it earns presence at bold and collapses toward a sans when lighter.
const david = David_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["700"],
  variable: "--font-david",
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
    <html lang="he" dir="rtl" className={`${frank.variable} ${heebo.variable} ${david.variable}`}>
      <body>
        <ServiceStatusBanner />
        {children}
      </body>
    </html>
  );
}
