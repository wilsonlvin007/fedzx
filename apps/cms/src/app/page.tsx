import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">fedzx.com</div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">内容后台系统</h1>
        <p className="mt-2 text-sm text-slate-600">
          Phase 1: 手动新增、编辑、发布内容。Phase 2 起将接入 RSS/API 导入与 AI 草稿。
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            进入后台
          </Link>
          <Link
            href="/api/public/articles"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            查看公开文章 JSON
          </Link>
        </div>
      </div>
    </main>
  );
}
