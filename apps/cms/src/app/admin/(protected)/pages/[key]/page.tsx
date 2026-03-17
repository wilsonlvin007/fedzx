import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";

export default async function PageModulesPage(props: { params: Promise<{ key: string }> }) {
  await requireAdminUser();
  const { key } = await props.params;

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

  const pageId = page.id;

  const modules = await prisma.pageModule.findMany({
    where: { pageId },
    orderBy: { order: "asc" },
  });

  async function addModule(formData: FormData) {
    "use server";
    await requireAdminUser();

    const type = String(formData.get("type") ?? "").trim();
    const html = String(formData.get("html") ?? "").trim();
    const order = Number(formData.get("order") ?? "0");
    if (!type || !html) return;

    await prisma.pageModule.create({
      data: {
        pageId,
        type,
        config: JSON.stringify({ html }),
        order: Number.isFinite(order) ? order : 0,
        status: "DRAFT",
      },
    });

    revalidatePath(`/admin/pages/${key}`);
    redirect(`/admin/pages/${encodeURIComponent(key)}`);
  }

  async function publishModule(formData: FormData) {
    "use server";
    await requireAdminUser();
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await prisma.pageModule.update({ where: { id }, data: { status: "PUBLISHED" } });
    revalidatePath(`/admin/pages/${key}`);
    redirect(`/admin/pages/${encodeURIComponent(key)}`);
  }

  async function unpublishModule(formData: FormData) {
    "use server";
    await requireAdminUser();
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await prisma.pageModule.update({ where: { id }, data: { status: "DRAFT" } });
    revalidatePath(`/admin/pages/${key}`);
    redirect(`/admin/pages/${encodeURIComponent(key)}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">页面: {page.key}</h1>
          <p className="mt-2 text-sm text-slate-600">
            公开读取:{" "}
            <Link className="underline" href={`/api/public/pages/${page.key}`}>
              /api/public/pages/{page.key}
            </Link>
          </p>
        </div>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50" href="/admin/pages">
          返回页面列表
        </Link>
      </div>

      <form action={addModule} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="模块类型" name="type" placeholder="hero / services / analysis / assets" required />
          <Field label="排序（数字，越小越靠前）" name="order" placeholder="0" />
          <div className="flex items-end justify-end">
            <button className="w-full sm:w-auto rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
              添加模块
            </button>
          </div>
        </div>
        <Textarea label="模块内容（HTML）" name="html" rows={10} required placeholder="<div>...</div>" />
        <div className="text-xs text-slate-500">
          Phase 1 先用 HTML 存储模块内容（保持现有样式与布局）；后续可按模块类型做可视化编辑器与字段化配置。
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left font-medium px-4 py-3">顺序</th>
              <th className="text-left font-medium px-4 py-3">类型</th>
              <th className="text-left font-medium px-4 py-3">状态</th>
              <th className="text-right font-medium px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {modules.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 text-slate-700">{m.order}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{m.type}</td>
                <td className="px-4 py-3 text-slate-600">{m.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    className="mr-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                    href={`/admin/pages/${encodeURIComponent(key)}/modules/${m.id}`}
                  >
                    编辑
                  </Link>
                  {m.status === "PUBLISHED" ? (
                    <form className="inline" action={unpublishModule}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50" type="submit">
                        取消发布
                      </button>
                    </form>
                  ) : (
                    <form className="inline" action={publishModule}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800" type="submit">
                        发布
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {modules.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-600" colSpan={4}>
                  还没有模块。你可以先把当前 fedzx.com 的 section 按类型拆成几个模块导入。
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

function Textarea({
  label,
  name,
  rows,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  rows: number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <textarea
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}
