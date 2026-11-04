import type { Lang } from "./i18n";

const PORTAL = (process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3000").replace(/\/$/, "");
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");

/** Links into the registration portal, which is a separate application. */
export const portal = {
  athlete: (lang: Lang) => `${PORTAL}/${lang}/register/athlete`,
  coach: (lang: Lang) => `${PORTAL}/${lang}/coach`,
  home: (lang: Lang) => `${PORTAL}/${lang}`,
};
