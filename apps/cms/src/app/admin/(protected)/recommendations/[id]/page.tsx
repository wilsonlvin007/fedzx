import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";
import { ContentStatus, RecommendationType } from "@/generated/prisma/enums";

export default async function EditRecommendationPage(props: { params: Promise<{ id: string }> }) {
  await requireAdminUser();
  const { id } = await props.params;

  const [rec, articles] = await Promise.all([
    prisma.recommendation.findUnique({ where: { id } }),
    prisma.article.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, title: true, slug: true },
    }),
  ]);

  if (!rec) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-slate-900 font-medium">推荐内容不存在</div>
        <div className="mt-3">
          <Link className="text-sm text-slate-700 underline" href="/admin/recommendations">
            返回
          </Link>
        </div>
      </div>
    );
  }

  async function save(formData: FormData) {
    "use server";
    await requireAdminUser();

    const title = String(formData.get("title") ?? "").trim();
    const slot = String(formData.get("slot") ?? "").trim();
    const order = Number(formData.get("order") ?? "0");
    const typeRaw = String(formData.get("type") ?? "EXTERNAL").trim();
    const statusRaw = String(formData.get("status") ?? "DRAFT").trim();
    const articleId = String(formData.get("articleId") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();

    if (!title || !slot) return;

    const type: RecommendationType = typeRaw === "ARTICLE" ? "ARTICLE" : "EXTERNAL";
    const status: ContentStatus = isContentStatus(statusRaw) ? statusRaw : "DRAFT";

    if (type === "ARTICLE" && !articleId) return;
    if (type === "EXTERNAL" && !url) return;

    await prisma.recommendation.update({
      where: { id },
      data: {
        title,
        slot,
        order: Number.isFinite(order) ? order : 0,
        type,
        status,
        articleId: type === "ARTICLE" ? articleId : null,
        url: type === "EXTERNAL" ? url : null,
      },
    });

    revalidatePath("/admin/recommendations");
    revalidatePath(`/admin/recommendations/${id}`);
    redirect(`/admin/recommendations/${id}`);
  }

  async function deleteRec(formData: FormData) {
    "use server";
    await requireAdminUser();
    const confirm = String(formData.get("confirm") ?? "");
    if (confirm !== "DELETE") return;

    await prisma.recommendation.delete({ where: { id } });
    revalidatePath("/admin/recommendations");
    redirect("/admin/recommendations");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">编辑推荐内容</h1>
          <p className="mt-2 text-sm text-slate-600">
            Slot: <span className="font-medium text-slate-900">{rec.slot}</span>，状态:{" "}
            <span className="font-medium text-slate-900">{rec.status}</span>
          </p>
        </div>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50" href="/admin/recommendations">
          返回列表
        </Link>
      </div>

      <form action={save} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="标题" name="title" required defaultValue={rec.title} />
          <Field label="Slot" name="slot" required defaultValue={rec.slot} />
          <Field label="排序" name="order" defaultValue={String(rec.order)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <div className="text-sm font-medium text-slate-700">类型</div>
            <select
              name="type"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
              defaultValue={rec.type}
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
              defaultValue={rec.articleId ?? ""}
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

        <Field label="外部链接（当类型为 EXTERNAL）" name="url" placeholder="https://..." defaultValue={rec.url ?? ""} />

        <label className="block">
          <div className="text-sm font-medium text-slate-700">状态</div>
          <select
            name="status"
            defaultValue={rec.status}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="DRAFT">DRAFT</option>
            <option value="REVIEW">REVIEW</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>

        <div className="flex items-center justify-end">
          <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            保存
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-red-200 bg-white p-5">
        <div className="text-sm font-medium text-red-700">危险操作</div>
        <p className="mt-2 text-sm text-slate-600">
          删除推荐内容会立即从数据库移除（不可恢复）。请输入 <code className="rounded bg-slate-100 px-1.5 py-0.5">DELETE</code> 以确认删除。
        </p>
        <form action={deleteRec} className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <input
            name="confirm"
            className="w-full sm:w-56 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-red-500/10"
            placeholder="DELETE"
          />
          <button className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700" type="submit">
            删除推荐内容
          </button>
        </form>
      </div>
    </div>
  );
}

function isContentStatus(value: string): value is ContentStatus {
  return value === "DRAFT" || value === "REVIEW" || value === "PUBLISHED" || value === "ARCHIVED";
}

function Field({
  label,
  name,
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
      />
    </label>
  );
}
