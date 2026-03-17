import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";
import { ContentStatus } from "@/generated/prisma/enums";

export default async function EditPageModulePage(props: { params: Promise<{ key: string; id: string }> }) {
  await requireAdminUser();
  const { key, id } = await props.params;

  const page = await prisma.page.findUnique({ where: { key } });
  if (!page) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-slate-900 font-medium">页面不存在</div>
        <div className="mt-3">
          <Link className="text-sm text-slate-700 underline" href="/admin/pages">
            返回
          </Link>
        </div>
      </div>
    );
  }

  const pageModule = await prisma.pageModule.findUnique({ where: { id } });
  if (!pageModule || pageModule.pageId !== page.id) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-slate-900 font-medium">模块不存在</div>
        <div className="mt-3">
          <Link className="text-sm text-slate-700 underline" href={`/admin/pages/${encodeURIComponent(key)}`}>
            返回
          </Link>
        </div>
      </div>
    );
  }

  const htmlValue = extractHtml(pageModule.config);

  async function save(formData: FormData) {
    "use server";
    await requireAdminUser();

    const type = String(formData.get("type") ?? "").trim();
    const html = String(formData.get("html") ?? "").trim();
    const order = Number(formData.get("order") ?? "0");
    const statusRaw = String(formData.get("status") ?? "DRAFT").trim();
    const status: ContentStatus = isContentStatus(statusRaw) ? statusRaw : "DRAFT";

    if (!type || !html) return;

    await prisma.pageModule.update({
      where: { id },
      data: {
        type,
        config: JSON.stringify({ html }),
        order: Number.isFinite(order) ? order : 0,
        status,
      },
    });

    revalidatePath(`/admin/pages/${key}`);
    revalidatePath(`/api/public/pages/${key}`);
    redirect(`/admin/pages/${encodeURIComponent(key)}/modules/${id}`);
  }

  async function deleteModule(formData: FormData) {
    "use server";
    await requireAdminUser();
    const confirm = String(formData.get("confirm") ?? "");
    if (confirm !== "DELETE") return;

    await prisma.pageModule.delete({ where: { id } });
    revalidatePath(`/admin/pages/${key}`);
    revalidatePath(`/api/public/pages/${key}`);
    redirect(`/admin/pages/${encodeURIComponent(key)}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">编辑模块</h1>
          <p className="mt-2 text-sm text-slate-600">
            页面: <span className="font-medium text-slate-900">{page.key}</span>，类型:{" "}
            <span className="font-medium text-slate-900">{pageModule.type}</span>
          </p>
        </div>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50" href={`/admin/pages/${page.key}`}>
          返回模块列表
        </Link>
      </div>

      <form action={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="模块类型" name="type" required defaultValue={pageModule.type} />
          <Field label="排序" name="order" defaultValue={String(pageModule.order)} />
          <SelectStatus defaultValue={pageModule.status} />
        </div>
        <Textarea label="模块内容（HTML）" name="html" rows={16} required defaultValue={htmlValue} />

        <div className="flex items-center justify-end">
          <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            保存
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-red-200 bg-white p-5">
        <div className="text-sm font-medium text-red-700">危险操作</div>
        <p className="mt-2 text-sm text-slate-600">
          删除模块会立即从数据库移除（不可恢复）。请输入 <code className="rounded bg-slate-100 px-1.5 py-0.5">DELETE</code> 以确认删除。
        </p>
        <form action={deleteModule} className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <input
            name="confirm"
            className="w-full sm:w-56 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-red-500/10"
            placeholder="DELETE"
          />
          <button className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700" type="submit">
            删除模块
          </button>
        </form>
      </div>
    </div>
  );
}

function isContentStatus(value: string): value is ContentStatus {
  return value === "DRAFT" || value === "REVIEW" || value === "PUBLISHED" || value === "ARCHIVED";
}

function extractHtml(config: string) {
  try {
    const parsed = JSON.parse(config) as unknown;
    if (isHtmlConfig(parsed)) return parsed.html;
    return config;
  } catch {
    return config;
  }
}

function isHtmlConfig(value: unknown): value is { html: string } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.html === "string";
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
