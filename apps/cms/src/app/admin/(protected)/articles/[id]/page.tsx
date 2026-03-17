import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";
import { ContentStatus } from "@/generated/prisma/enums";

export default async function EditArticlePage(props: { params: Promise<{ id: string }> }) {
  await requireAdminUser();
  const { id } = await props.params;

  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-slate-900 font-medium">文章不存在</div>
        <div className="mt-3">
          <Link className="text-sm text-slate-700 underline" href="/admin/articles">
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  async function save(formData: FormData) {
    "use server";
    const user = await requireAdminUser();
    const title = String(formData.get("title") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const coverImage = String(formData.get("coverImage") ?? "").trim();
    const tagsCsv = String(formData.get("tags") ?? "").trim();
    const statusRaw = String(formData.get("status") ?? "DRAFT").trim();
    const status = isContentStatus(statusRaw) ? statusRaw : "DRAFT";

    if (!title || !slug || !body) return;

    await prisma.article.update({
      where: { id },
      data: {
        title,
        slug,
        summary: summary || null,
        body,
        coverImage: coverImage || null,
        tags: JSON.stringify(parseTags(tagsCsv)),
        status: status as ContentStatus,
        updatedById: user.id,
      },
    });

    revalidatePath(`/admin/articles/${id}`);
    revalidatePath("/admin/articles");
    redirect(`/admin/articles/${id}`);
  }

  async function publish() {
    "use server";
    const user = await requireAdminUser();
    await prisma.article.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date(), updatedById: user.id },
    });
    revalidatePath(`/admin/articles/${id}`);
    revalidatePath("/admin/articles");
    redirect(`/admin/articles/${id}`);
  }

  async function unpublish() {
    "use server";
    const user = await requireAdminUser();
    await prisma.article.update({
      where: { id },
      data: { status: "DRAFT", publishedAt: null, updatedById: user.id },
    });
    revalidatePath(`/admin/articles/${id}`);
    revalidatePath("/admin/articles");
    redirect(`/admin/articles/${id}`);
  }

  async function deleteArticle(formData: FormData) {
    "use server";
    await requireAdminUser();
    const confirm = String(formData.get("confirm") ?? "");
    if (confirm !== "DELETE") return;

    await prisma.article.delete({ where: { id } });
    revalidatePath("/admin/articles");
    redirect("/admin/articles");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">编辑文章</h1>
          <div className="mt-2 text-sm text-slate-600">
            状态: <span className="font-medium text-slate-900">{article.status}</span>
            {article.publishedAt ? <>，发布于 {formatDate(article.publishedAt)}</> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {article.status === "PUBLISHED" ? (
            <form action={unpublish}>
              <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50" type="submit">
                下线
              </button>
            </form>
          ) : (
            <form action={publish}>
              <button className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800" type="submit">
                发布
              </button>
            </form>
          )}
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50" href="/admin/articles">
            返回列表
          </Link>
        </div>
      </div>

      <form action={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <Field label="标题" name="title" required defaultValue={article.title} />
        <Field label="Slug（用于 URL）" name="slug" required defaultValue={article.slug} />
        <Field label="封面图 URL（可选）" name="coverImage" defaultValue={article.coverImage ?? ""} />
        <Field label="标签（逗号分隔）" name="tags" defaultValue={safeTagsToCsv(article.tags)} />
        <SelectStatus defaultValue={article.status} />
        <Textarea label="摘要" name="summary" rows={3} defaultValue={article.summary ?? ""} />
        <Textarea label="正文（Markdown）" name="body" rows={14} required defaultValue={article.body} />

        <div className="flex items-center justify-end">
          <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            保存
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-red-200 bg-white p-5">
        <div className="text-sm font-medium text-red-700">危险操作</div>
        <p className="mt-2 text-sm text-slate-600">
          删除文章会立即从数据库移除（不可恢复）。请输入 <code className="rounded bg-slate-100 px-1.5 py-0.5">DELETE</code>{" "}
          以确认删除。
        </p>
        <form action={deleteArticle} className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <input
            name="confirm"
            className="w-full sm:w-56 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-red-500/10"
            placeholder="DELETE"
          />
          <button className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700" type="submit">
            删除文章
          </button>
        </form>
      </div>
    </div>
  );
}

function parseTags(csv: string): string[] {
  if (!csv) return [];
  return Array.from(
    new Set(
      csv
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}

function safeTagsToCsv(tags: string) {
  try {
    const arr = JSON.parse(tags) as unknown;
    if (Array.isArray(arr)) return arr.join(", ");
    return "";
  } catch {
    return "";
  }
}

function isContentStatus(value: string): value is ContentStatus {
  return value === "DRAFT" || value === "REVIEW" || value === "PUBLISHED" || value === "ARCHIVED";
}

function Field({
  label,
  name,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
        name={name}
        required={required}
        defaultValue={defaultValue}
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  rows,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  rows: number;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <textarea
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
      />
    </label>
  );
}

function SelectStatus({ defaultValue }: { defaultValue: string }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700">状态</div>
      <select
        name="status"
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
      >
        <option value="DRAFT">DRAFT</option>
        <option value="REVIEW">REVIEW</option>
        <option value="PUBLISHED">PUBLISHED</option>
        <option value="ARCHIVED">ARCHIVED</option>
      </select>
    </label>
  );
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
