export const LANGS = ["si", "ta", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "si";
export const LANG_COOKIE = "sla_lang";

export const LANG_NAMES: Record<Lang, string> = { si: "සිංහල", ta: "தமிழ்", en: "English" };

export const isLang = (v: string | undefined): v is Lang => (LANGS as readonly string[]).includes(v ?? "");
