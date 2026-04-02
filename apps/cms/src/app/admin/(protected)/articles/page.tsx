import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";
import { getArticlesViews } from "@/lib/views";
import { exportPublicSite } from "@/lib/public-export";

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

  // 获取所有文章的阅读数
  const articleIds = items.map(a => a.id);
  const viewsMap = await getArticlesViews(articleIds);

  async function publish(formData: FormData) {
    "use server";
    const user = await requireAdminUser();
    const id = String(formData.get("id") ?? "");
    if (!id) return;

    await prisma.article.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        updatedById: user.id,
      },
    });
    await exportPublicSite();
    revalidatePath("/admin/articles");
    redirect("/admin/articles");
  }

  async function unpublish(formData: FormData) {
    "use server";
    const user = await requireAdminUser();
    const id = String(formData.get("id") ?? "");
    if (!id) return;

    await prisma.article.update({
      where: { id },
      data: { status: "DRAFT", publishedAt: null, updatedById: user.id },
    });
    await exportPublicSite();
    revalidatePath("/admin/articles");
    redirect("/admin/articles");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">文章</h1>
          <p className="mt-2 text-sm text-slate-600">支持草稿、发布，以及后续的导入与 AI 草稿。</p>
        </div>
        <Link
          href="/admin/articles/new"
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          新建文章
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left font-medium px-4 py-3">标题</th>
              <th className="text-left font-medium px-4 py-3">状态</th>
              <th className="text-right font-medium px-4 py-3">阅读数</th>
              <th className="text-left font-medium px-4 py-3">更新时间</th>
              <th className="text-left font-medium px-4 py-3">发布</th>
              <th className="text-right font-medium px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((a) => {
              const views = viewsMap.get(a.id) || 0;
              return (
                <tr key={a.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{a.title}</div>
                    <div className="text-xs text-slate-500">{a.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {views > 0 ? views.toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(a.updatedAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{a.publishedAt ? formatDate(a.publishedAt) : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                        href={`/admin/articles/${a.id}`}
                      >
                        编辑
                      </Link>
                      {a.status === "PUBLISHED" ? (
                        <form action={unpublish}>
                          <input type="hidden" name="id" value={a.id} />
                          <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50" type="submit">
                            下线
                          </button>
                        </form>
                      ) : (
                        <form action={publish}>
                          <input type="hidden" name="id" value={a.id} />
                          <button className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800" type="submit">
                            发布
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-600" colSpan={6}>
                  还没有文章，先去新建一篇。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "草稿", cls: "bg-slate-100 text-slate-700" },
    REVIEW: { label: "审核", cls: "bg-amber-100 text-amber-800" },
    PUBLISHED: { label: "已发布", cls: "bg-emerald-100 text-emerald-800" },
    ARCHIVED: { label: "归档", cls: "bg-slate-100 text-slate-600" },
  };
  const it = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-700" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${it.cls}`}>{it.label}</span>;
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
