import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";

export default async function PagesListPage() {
  await requireAdminUser();

  const pages = await prisma.page.findMany({ orderBy: { updatedAt: "desc" } });

  async function create(formData: FormData) {
    "use server";
    await requireAdminUser();

    const key = String(formData.get("key") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    if (!key) return;

    await prisma.page.create({
      data: {
        key,
        title: title || null,
        status: "DRAFT",
      },
    });

    revalidatePath("/admin/pages");
    redirect(`/admin/pages/${encodeURIComponent(key)}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">页面模块</h1>
        <p className="mt-2 text-sm text-slate-600">把静态站的 section 抽象成可配置模块，发布后可通过公开 JSON 接口读取。</p>
      </div>

      <form action={create} className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <Field label="Page Key" name="key" placeholder="home" required />
        <Field label="标题（可选）" name="title" placeholder="Home" />
        <div className="flex items-end justify-end">
          <button className="w-full sm:w-auto rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            新建页面
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left font-medium px-4 py-3">Key</th>
              <th className="text-left font-medium px-4 py-3">标题</th>
              <th className="text-left font-medium px-4 py-3">状态</th>
              <th className="text-right font-medium px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {pages.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-900">{p.key}</td>
                <td className="px-4 py-3 text-slate-700">{p.title ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">{p.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50" href={`/admin/pages/${p.key}`}>
                    管理模块
                  </Link>
                </td>
              </tr>
            ))}
            {pages.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-600" colSpan={4}>
                  暂无页面。
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

