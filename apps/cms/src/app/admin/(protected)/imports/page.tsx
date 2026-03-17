export default async function ImportsPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold text-slate-900">导入（Phase 2）</h1>
      <p className="mt-2 text-sm text-slate-600">
        这里会接入 RSS / API 导入，把外部内容先进入“采集收件箱”，再由 AI 生成草稿并进入人工审核。
      </p>
      <div className="mt-4 text-sm text-slate-700">
        当前版本已预留受保护 API 路由前缀：<code className="rounded bg-slate-100 px-1.5 py-0.5">/api/admin/*</code>。
      </div>
    </div>
  );
}

