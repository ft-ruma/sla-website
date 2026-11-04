import { InfoPageView, infoPageMeta } from "@/components/InfoPageView";
import { pageLang, type LangParams } from "@/lib/page";

export async function generateMetadata({ params }: LangParams) {
  const { lang } = await pageLang(params);
  return infoPageMeta(lang, "about", "/about");
}

export default async function Page({ params }: LangParams) {
  const { lang } = await pageLang(params);
  return <InfoPageView lang={lang} page="about" />;
}
