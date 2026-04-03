"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ArticleRow } from "./page";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  items: ArticleRow[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "草稿", cls: "bg-slate-100 text-slate-700" },
    REVIEW: { label: "审核", cls: "bg-amber-100 text-amber-800" },
    PUBLISHED: { label: "已发布", cls: "bg-emerald-100 text-emerald-800" },
    ARCHIVED: { label: "归档", cls: "bg-slate-100 text-slate-600" },
  };
  const it = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${it.cls}`}>
      {it.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ArticlesTable({ items }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const allIds = items.map((a) => a.id);
  const allSelected = allIds.length > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleBatchDelete = useCallback(async () => {
    if (selected.size === 0) return;
    const count = selected.size;
    const msg = `确定要删除选中的 ${count} 篇文章吗？此操作不可撤销。`;
    if (!confirm(msg)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/articles?ids=${Array.from(selected).join(",")}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");

      showToast(`成功删除 ${data.deleted} 篇文章`);
      setSelected(new Set());
      router.refresh();
    } catch (err: any) {
      showToast(err.message || "删除失败");
    } finally {
      setDeleting(false);
    }
  }, [selected, router]);

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-[fadeIn_0.2s_ease] rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
              </th>
              <th className="text-left font-medium px-4 py-3">标题</th>
              <th className="text-left font-medium px-4 py-3">状态</th>
              <th className="text-right font-medium px-4 py-3">阅读数</th>
              <th className="text-left font-medium px-4 py-3">更新时间</th>
              <th className="text-left font-medium px-4 py-3">发布</th>
              <th className="text-right font-medium px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((a) => {
              const checked = selected.has(a.id);
              return (
                <tr key={a.id} className={`hover:bg-slate-50/60 ${checked ? "bg-blue-50/50" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(a.id)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{a.title}</div>
                    <div className="text-xs text-slate-500">{a.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {a.views > 0 ? a.views.toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(a.updatedAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{a.publishedAt ? formatDate(a.publishedAt) : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                        href={`/admin/articles/${a.id}`}
                      >
                        编辑
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-600" colSpan={7}>
                  还没有文章，先去新建一篇。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Batch action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-sm text-slate-600">
            已选择 <span className="font-semibold text-slate-900">{selected.size}</span> 篇
          </span>
          <button
            onClick={handleBatchDelete}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? "删除中..." : "批量删除"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            取消选择
          </button>
        </div>
      )}
    </div>
  );
}
