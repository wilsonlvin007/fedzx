import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";
import { TagSelector } from "@/app/admin/(protected)/_components/TagSelector";
import { getTagOptions, syncArticleTags } from "@/lib/tags";

export default async function NewArticlePage() {
  await requireAdminUser();
  const tagOptions = await getTagOptions();

  async function create(formData: FormData) {
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

    if (!title || !slug || !body) return;

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        question: question || null,
        shortAnswer: shortAnswer || null,
        summary: summary || null,
        body,
        sources: sources || null,
        coverImage: coverImage || null,
        tags: "[]",
        status: "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await syncArticleTags(article.id, tagValues);

    revalidatePath("/admin/articles");
    redirect("/admin/articles");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">新建文章</h1>
        <p className="mt-2 text-sm text-slate-600">正文建议用 Markdown，后续阶段可由 AI 辅助生成草稿。</p>
      </div>

      <form action={create} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <Field label="标题" name="title" required />
        <Field label="Slug（用于 URL）" name="slug" placeholder="例如: fed-policy-2026-03" required />
        <Field label="封面图 URL（可选）" name="coverImage" placeholder="https://..." />
        <Field
          label="Question（可选）"
          name="question"
          hint="写成用户会搜索的问题。示例：高利率下科技股如何配置？"
        />
        <Textarea
          label="Short Answer（可选）"
          name="short_answer"
          rows={3}
          hint="1~2 句话核心结论，要可以被直接引用。"
        />
        <Textarea label="Summary（可选）" name="summary" rows={3} hint="用于首页展示的人类可读摘要。" />
        <Textarea label="Body（正文 Markdown）" name="body" rows={14} required />
        <Textarea label="Sources（可选）" name="sources" rows={4} hint="数据或观点来源（换行分隔）。" />

        <TagSelector initialOptions={tagOptions} />

        <div className="flex items-center justify-end">
          <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            创建草稿
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  rows,
  required,
  hint,
}: {
  label: string;
  name: string;
  rows: number;
  required?: boolean;
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
      />
    </label>
  );
}
