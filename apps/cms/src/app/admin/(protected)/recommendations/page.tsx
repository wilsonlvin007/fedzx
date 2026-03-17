import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";
import { RecommendationType } from "@/generated/prisma/enums";

export default async function RecommendationsPage() {
  await requireAdminUser();

  const [items, articles] = await Promise.all([
    prisma.recommendation.findMany({ orderBy: [{ slot: "asc" }, { order: "asc" }] }),
    prisma.article.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, title: true, slug: true },
    }),
  ]);

  async function create(formData: FormData) {
    "use server";
    await requireAdminUser();

    const type = String(formData.get("type") ?? "EXTERNAL").trim();
    const title = String(formData.get("title") ?? "").trim();
    const slot = String(formData.get("slot") ?? "home").trim();
    const order = Number(formData.get("order") ?? "0");
    const articleId = String(formData.get("articleId") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();

    if (!title || !slot) return;
    const recType: RecommendationType = type === "ARTICLE" ? "ARTICLE" : "EXTERNAL";
    if (recType === "ARTICLE" && !articleId) return;
    if (recType === "EXTERNAL" && !url) return;

    await prisma.recommendation.create({
      data: {
        type: recType,
        title,
        slot,
        order: Number.isFinite(order) ? order : 0,
        status: "DRAFT",
        articleId: recType === "ARTICLE" ? articleId : null,
        url: recType === "EXTERNAL" ? url : null,
      },
    });

    revalidatePath("/admin/recommendations");
    redirect("/admin/recommendations");
  }

  async function publish(formData: FormData) {
    "use server";
    await requireAdminUser();
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await prisma.recommendation.update({ where: { id }, data: { status: "PUBLISHED" } });
    revalidatePath("/admin/recommendations");
    redirect("/admin/recommendations");
  }

  async function unpublish(formData: FormData) {
    "use server";
    await requireAdminUser();
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await prisma.recommendation.update({ where: { id }, data: { status: "DRAFT" } });
    revalidatePath("/admin/recommendations");
    redirect("/admin/recommendations");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">推荐位</h1>
        <p className="mt-2 text-sm text-slate-600">用于首页精选、侧边栏、置顶链接等运营入口。</p>
      </div>

      <form action={create} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="标题" name="title" required />
          <Field label="Slot（位置）" name="slot" placeholder="home" required />
          <Field label="排序" name="order" placeholder="0" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <div className="text-sm font-medium text-slate-700">类型</div>
            <select
              name="type"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
              defaultValue="EXTERNAL"
            >
              <option value="EXTERNAL">EXTERNAL</option>
              <option value="ARTICLE">ARTICLE</option>
            </select>
          </label>

          <label className="block sm:col-span-2">
            <div className="text-sm font-medium text-slate-700">关联文章（当类型为 ARTICLE）</div>
            <select
              name="articleId"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
              defaultValue=""
            >
              <option value="">-</option>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.slug})
                </option>
              ))}
            </select>
          </label>
        </div>

        <Field label="外部链接（当类型为 EXTERNAL）" name="url" placeholder="https://..." />

        <div className="flex items-center justify-end">
          <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            创建草稿
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left font-medium px-4 py-3">Slot</th>
              <th className="text-left font-medium px-4 py-3">标题</th>
              <th className="text-left font-medium px-4 py-3">类型</th>
              <th className="text-left font-medium px-4 py-3">状态</th>
              <th className="text-right font-medium px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 text-slate-700">
                  {r.slot} · {r.order}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.title}</td>
                <td className="px-4 py-3 text-slate-600">{r.type}</td>
                <td className="px-4 py-3 text-slate-600">{r.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    className="mr-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                    href={`/admin/recommendations/${r.id}`}
                  >
                    编辑
                  </Link>
                  {r.status === "PUBLISHED" ? (
                    <form className="inline" action={unpublish}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50" type="submit">
                        取消发布
                      </button>
                    </form>
                  ) : (
                    <form className="inline" action={publish}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800" type="submit">
                        发布
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-600" colSpan={5}>
                  暂无推荐内容。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}
