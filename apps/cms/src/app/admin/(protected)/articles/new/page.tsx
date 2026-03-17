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
    const summary = String(formData.get("summary") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const coverImage = String(formData.get("coverImage") ?? "").trim();
    const tagsCsv = String(formData.get("tags") ?? "").trim();

    if (!title || !slug || !body) return;

    await prisma.article.create({
      data: {
        title,
        slug,
        summary: summary || null,
        body,
        coverImage: coverImage || null,
        tags: JSON.stringify(parseTags(tagsCsv)),
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
        <Field label="标签（逗号分隔，可选）" name="tags" placeholder="宏观, 美联储, 利率" />
        <Textarea label="摘要（可选）" name="summary" rows={3} />
        <Textarea label="正文（Markdown）" name="body" rows={14} required />

        <div className="flex items-center justify-end">
          <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            创建草稿
          </button>
        </div>
      </form>
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

function Textarea({
  label,
  name,
  rows,
  required,
}: {
  label: string;
  name: string;
  rows: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <textarea
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
        name={name}
        rows={rows}
        required={required}
      />
    </label>
  );
}

