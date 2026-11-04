"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDict, isLang } from "@/lib/i18n";

export default function NotFound() {
  const first = usePathname().split("/")[1];
  const lang = isLang(first) ? first : "en";
  const t = getDict(lang);
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-6xl font-bold text-accent">404</p>
      <h1 className="text-2xl font-bold">{t.notFoundTitle}</h1>
      <p className="text-muted">{t.notFoundText}</p>
      <Link href={`/${lang}`} className="mt-2 text-sm font-bold tracking-wide uppercase hover:text-accent">{t.goHome}</Link>
    </div>
  );
}
