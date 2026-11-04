import { NewsCard } from "@/components/NewsCard";
import { Container, PageHero } from "@/components/PageHero";
import { getNews } from "@/lib/cms";
import { pageLang, pageMeta, type LangParams } from "@/lib/page";

export async function generateMetadata({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  return pageMeta(lang, "/news", t.newsTitle, t.newsIntro);
}

export default async function NewsPage({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  const [featured, ...rest] = await getNews();
  return (
    <>
      <PageHero kicker={t.navNews} title={t.newsTitle} intro={t.newsIntro} />
      {featured && <NewsCard item={featured} lang={lang} t={t} variant="feature" />}
      <Container className="grid gap-x-8 gap-y-12 py-14 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((n) => <NewsCard key={n.slug} item={n} lang={lang} t={t} variant="card" />)}
      </Container>
    </>
  );
}
