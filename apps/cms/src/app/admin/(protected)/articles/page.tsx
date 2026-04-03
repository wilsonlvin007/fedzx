import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";
import { getArticlesViews } from "@/lib/views";
import ArticlesTable from "./ArticlesTable";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  views: number;
  updatedAt: Date;
  publishedAt: Date | null;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function ArticlesListPage() {
  await requireAdminUser();

  const items = await prisma.article.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      updatedAt: true,
      publishedAt: true,
    },
  });

  const articleIds = items.map((a) => a.id);
  const viewsMap = await getArticlesViews(articleIds);

  const rows: ArticleRow[] = items.map((a) => ({
    ...a,
    views: viewsMap.get(a.id) || 0,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">文章</h1>
          <p className="mt-2 text-sm text-slate-600">
            支持草稿、发布，以及后续的导入与 AI 草稿。
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          新建文章
        </Link>
      </div>

      <ArticlesTable items={rows} />
    </div>
  );
}
