import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";

export default async function NewArticlePage() {
  await requireAdminUser();

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
    const tagsSelected = formData.getAll("tags").map((t) => String(t).trim()).filter(Boolean);
    const tagsCustomCsv = String(formData.get("tags_custom") ?? "").trim();

    if (!title || !slug || !body) return;

    await prisma.article.create({
      data: {
        title,
        slug,
        question: question || null,
        shortAnswer: shortAnswer || null,
        summary: summary || null,
        body,
        sources: sources || null,
        coverImage: coverImage || null,
        tags: JSON.stringify(mergeTags(tagsSelected, tagsCustomCsv)),
        status: "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
    });

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

        <TagSelector />

        <div className="flex items-center justify-end">
          <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            创建草稿
          </button>
        </div>
      </form>
    </div>
  );
}

function mergeTags(selected: string[], customCsv: string): string[] {
  const merged = selected.concat(parseCsv(customCsv));
  return Array.from(new Set(merged.map((t) => t.trim()).filter(Boolean)));
}

function parseCsv(csv: string): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
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

function TagSelector() {
  const preset = ["政策分析", "资产配置", "市场解读", "宏观", "利率", "通胀", "就业", "科技股", "银行", "美元", "债券"];
  return (
    <div className="block">
      <div className="text-sm font-medium text-slate-700">Tags（多选，可选）</div>
      <div className="mt-1 text-xs text-slate-500">勾选常用标签，也可以在下方补充自定义标签（逗号分隔）。</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {preset.map((t) => (
          <label key={t} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
            <input className="accent-slate-900" type="checkbox" name="tags" value={t} />
            <span className="text-slate-700">{t}</span>
          </label>
        ))}
      </div>
      <div className="mt-3">
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
          name="tags_custom"
          placeholder="自定义标签（逗号分隔），例如：美联储, 软着陆"
        />
      </div>
    </div>
  );
}
