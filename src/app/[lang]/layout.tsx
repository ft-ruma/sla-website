import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getSettings } from "@/lib/cms";
import { langParams, pageLang, type LangParams } from "@/lib/page";
import { SITE_URL } from "@/lib/portal";
import "../globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const notoSinhala = Noto_Sans_Sinhala({ variable: "--font-sinhala", subsets: ["sinhala"] });
const notoTamil = Noto_Sans_Tamil({ variable: "--font-tamil", subsets: ["tamil"] });

export const generateStaticParams = langParams;

export const metadata: Metadata = { metadataBase: new URL(SITE_URL) };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default async function LangLayout({ children, params }: LangParams & { children: React.ReactNode }) {
  const { lang, t } = await pageLang(params);
  const fonts = [inter, notoSinhala, notoTamil].map((f) => f.variable).join(" ");
  return (
    <html lang={lang}>
      <body className={`${fonts} flex min-h-dvh flex-col font-sans antialiased`}>
        <SiteHeader lang={lang} t={t} notice={(await getSettings()).sampleNotice ? t.sampleNotice : undefined} />
        <main id="main" className="flex flex-1 flex-col">{children}</main>
        <SiteFooter lang={lang} t={t} />
      </body>
    </html>
  );
}
