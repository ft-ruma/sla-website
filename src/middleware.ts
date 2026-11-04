import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, LANG_COOKIE, LANGS, isLang, type Lang } from "@/lib/langs";

// Every page lives under /si, /ta or /en. Anything else is sent to the
// visitor's remembered language, then their browser language, then Sinhala.
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const first = pathname.split("/")[1];
  if (isLang(first)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/${pickLang(req)}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

function pickLang(req: NextRequest): Lang {
  const saved = req.cookies.get(LANG_COOKIE)?.value;
  if (isLang(saved)) return saved;
  const accept = req.headers.get("accept-language")?.toLowerCase() ?? "";
  for (const part of accept.split(",")) {
    const code = part.trim().slice(0, 2);
    if ((LANGS as readonly string[]).includes(code)) return code as Lang;
  }
  return DEFAULT_LANG;
}

export const config = {
  matcher: ["/((?!_next|api|admin|brand|icon.png|apple-icon.png|favicon.ico|robots.txt|sitemap.xml).*)"],
};
