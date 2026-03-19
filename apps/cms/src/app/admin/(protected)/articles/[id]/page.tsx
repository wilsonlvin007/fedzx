import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";
import { ContentStatus } from "@/generated/prisma/enums";
import { TagSelector } from "@/app/admin/(protected)/_components/TagSelector";
import { getTagOptions, syncArticleTags } from "@/lib/tags";

export default async function EditArticlePage(props: { params: Promise<{ id: string }> }) {
  await requireAdminUser();
  const { id } = await props.params;
  const tagOptions = await getTagOptions();

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
    const question = String(formData.get("question") ?? "").trim();
    const shortAnswer = String(formData.get("short_answer") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const sources = String(formData.get("sources") ?? "").trim();
    const coverImage = String(formData.get("coverImage") ?? "").trim();
    const tagValues = formData.getAll("tagValues").map((t) => String(t).trim()).filter(Boolean);
    const statusRaw = String(formData.get("status") ?? "DRAFT").trim();
    const status = isContentStatus(statusRaw) ? statusRaw : "DRAFT";

    if (!title || !slug || !body) return;

    await prisma.article.update({
      where: { id },
      data: {
        title,
        slug,
        question: question || null,
        shortAnswer: shortAnswer || null,
        summary: summary || null,
        body,
        sources: sources || null,
        coverImage: coverImage || null,
        status: status as ContentStatus,
        updatedById: user.id,
      },
    });

    await syncArticleTags(id, tagValues);

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
        <Field
          label="Question（可选）"
          name="question"
          defaultValue={article.question ?? ""}
          hint="写成用户会搜索的问题。示例：高利率下科技股如何配置？"
        />
        <Textarea
          label="Short Answer（可选）"
          name="short_answer"
          rows={3}
          defaultValue={article.shortAnswer ?? ""}
          hint="1~2 句话核心结论，要可以被直接引用。"
        />
        <Textarea label="Summary（可选）" name="summary" rows={3} defaultValue={article.summary ?? ""} hint="用于首页展示的人类可读摘要。" />
        <Textarea label="Body（正文 Markdown）" name="body" rows={14} required defaultValue={article.body} />
        <Textarea label="Sources（可选）" name="sources" rows={4} defaultValue={article.sources ?? ""} hint="数据或观点来源（换行分隔）。" />

        <TagSelector initialOptions={tagOptions} defaultSelected={safeTagsToArray(article.tags)} />
        <SelectStatus defaultValue={article.status} />

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

function safeTagsToArray(tags: string): string[] {
  try {
    const arr = JSON.parse(tags) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
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
  hint,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
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
  hint,
}: {
  label: string;
  name: string;
  rows: number;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
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
