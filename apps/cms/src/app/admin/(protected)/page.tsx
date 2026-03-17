import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";

export default async function AdminHomePage() {
  await requireAdminUser();

  const [articles, pages, recommendations] = await Promise.all([
    prisma.article.count(),
    prisma.page.count(),
    prisma.recommendation.count(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">运营面板</h1>
        <p className="mt-2 text-sm text-slate-600">
          第一阶段：手动新增、编辑、发布内容。第二阶段开始会在这里接入导入与 AI 草稿。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="文章" value={articles} href="/admin/articles" />
        <Card title="页面模块" value={pages} href="/admin/pages" />
        <Card title="推荐位" value={recommendations} href="/admin/recommendations" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-medium text-slate-900">静态站接入方式（Phase 1）</div>
        <div className="mt-2 text-sm text-slate-600">
          你的静态站可以直接请求公开 JSON 接口获取内容，例如{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/public/articles</code>。
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50" href="/api/public/articles">
            查看已发布文章 JSON
          </Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50" href="/api/public/pages/home">
            查看 Home 模块 JSON
          </Link>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, href }: { title: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-5 hover:bg-slate-50">
      <div className="text-sm text-slate-600">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
      <div className="mt-4 text-sm text-slate-600">进入管理</div>
    </Link>
  );
}

