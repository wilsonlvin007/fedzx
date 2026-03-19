import Link from "next/link";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";
import { LogoutButton } from "@/app/admin/(protected)/_components/LogoutButton";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold text-slate-900">
              fedzx 后台
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm text-slate-600">
              <Link className="hover:text-slate-900" href="/admin/articles">
                文章
              </Link>
              <Link className="hover:text-slate-900" href="/admin/pages">
                页面模块
              </Link>
              <Link className="hover:text-slate-900" href="/admin/recommendations">
                推荐位
              </Link>
              <a className="hover:text-slate-900" href="https://fedzx.com/" target="_blank" rel="noreferrer">
                官网
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-sm text-slate-600">{user.email}</div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
