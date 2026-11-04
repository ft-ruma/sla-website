import { LockKeyhole } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { cmsAvailable, currentEditor } from "@/lib/cms-auth";
import { login } from "../actions";
import { INPUT, LABEL } from "../ui";

export const dynamic = "force-dynamic";

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentEditor()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-night p-4">
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(50rem_25rem_at_80%_0%,rgb(232_93_4/0.3),transparent_60%),radial-gradient(40rem_25rem_at_0%_100%,rgb(6_7_248/0.3),transparent_60%)]" />
      <div className="card relative w-full max-w-sm p-7">
        <div className="flex items-center gap-3">
          <Image src="/brand/sla-logo.png" alt="" width={44} height={44} className="size-11" />
          <div>
            <p className="font-extrabold">Sri Lanka Athletics</p>
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Website admin</p>
          </div>
        </div>
        {!cmsAvailable() ? (
          <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            The admin needs WEB_DATABASE_URL and a CMS_SECRET (or MEMBER_AUTH_SECRET) of 32+ characters. See the website README.
          </p>
        ) : (
          <form action={login} className="mt-6 flex flex-col gap-4">
            <label className={LABEL}>
              Email
              <input name="email" type="email" required autoComplete="username" autoFocus className={INPUT} />
            </label>
            <label className={LABEL}>
              Password
              <input name="password" type="password" required autoComplete="current-password" className={INPUT} />
            </label>
            {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">The email or password is wrong, or the account is locked for an hour after many attempts.</p>}
            <button className="btn btn-primary mt-1"><LockKeyhole className="size-4" aria-hidden /> Sign in</button>
          </form>
        )}
      </div>
    </main>
  );
}
