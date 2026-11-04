import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import "../globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// editors write Sinhala and Tamil too
const notoSinhala = Noto_Sans_Sinhala({ variable: "--font-sinhala", subsets: ["sinhala"] });
const notoTamil = Noto_Sans_Tamil({ variable: "--font-tamil", subsets: ["tamil"] });

export const metadata: Metadata = { title: "Website admin · Sri Lanka Athletics", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f6f5f2" };

/** The website's content admin. English only; separate from the public pages' layout. */
export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${notoSinhala.variable} ${notoTamil.variable} min-h-dvh bg-sand font-sans text-ink antialiased`}>{children}</body>
    </html>
  );
}
