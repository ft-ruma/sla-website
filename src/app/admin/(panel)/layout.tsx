import { requireEditor } from "@/lib/cms-auth";
import { logout } from "../actions";
import { AdminNav } from "./Nav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // the account page lets a new editor in to choose a password; every other page needs one
  const { editor } = await requireEditor({ allowPasswordChange: true });
  return (
    <div className="lg:flex">
      <AdminNav name={editor.display_name} role={editor.role} logout={logout} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
