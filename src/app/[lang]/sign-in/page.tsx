import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, Notice } from "@/components/bits";
import { SignInFlow } from "@/components/MemberForms";
import { Container, PageHero } from "@/components/PageHero";
import { currentMember, memberSignInAvailable } from "@/lib/member-auth";
import { MOCK, MOCK_MEMBERS } from "@/lib/member-mock";
import { pageLang, pageMeta, type LangParams } from "@/lib/page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  return { ...pageMeta(lang, "/sign-in", t.signInTitle, t.signInIntro), robots: { index: false } };
}

export default async function SignInPage({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  if (await currentMember().catch(() => null)) redirect(`/${lang}/account`);

  return (
    <>
      <PageHero kicker={t.navCommunity} title={t.signInTitle} intro={t.signInIntro} />
      <Container className="grid gap-6 py-12 lg:grid-cols-[1.3fr_1fr]">
        {!memberSignInAvailable() && <div className="lg:col-span-2"><Notice>{t.signInUnavailable}</Notice></div>}
        {MOCK && (
          <div data-testid="mock-accounts" className="border border-dashed border-amber-400 bg-amber-50 p-5 text-sm lg:col-span-2">
            <p className="font-bold">Test mode: fictional records, kept in memory until the server restarts. No email is sent.</p>
            <ul className="mt-3 grid gap-1.5 font-mono">
              {MOCK_MEMBERS.map((m) => (
                <li key={m.slaa_id}>{m.email} · {m.slaa_id} · <span className="font-sans">{m.note}</span></li>
              ))}
            </ul>
          </div>
        )}
        <Card className="p-6 sm:p-8">
          <SignInFlow lang={lang} t={t} />
        </Card>
        <div className="flex flex-col gap-4">
          {[t.signInFirstTime, t.signInSameEmail, t.signInNoAccess].map((note) => (
            <p key={note} className="flex gap-3 text-sm text-muted">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
              {note}
            </p>
          ))}
        </div>
      </Container>
    </>
  );
}
