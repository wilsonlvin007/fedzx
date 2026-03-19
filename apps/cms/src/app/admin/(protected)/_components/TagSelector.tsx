"use client";

import { useMemo, useState } from "react";

type Props = {
  initialOptions: string[];
  defaultSelected?: string[];
};

export function TagSelector({ initialOptions, defaultSelected = [] }: Props) {
  const [options, setOptions] = useState<string[]>(initialOptions);
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggleTag(name: string) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : prev.concat(name)));
  }

  async function addTag() {
    const raw = custom.trim();
    if (!raw || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: raw }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "添加标签失败");
      const name = typeof json?.tag?.name === "string" ? json.tag.name : raw;
      setOptions((prev) => Array.from(new Set(prev.concat(name))));
      setSelected((prev) => (prev.includes(name) ? prev : prev.concat(name)));
      setCustom("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加标签失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="block">
      <div className="text-sm font-medium text-slate-700">Tags（多选，可选）</div>
      <div className="mt-1 text-xs text-slate-500">输入自定义标签后点击“添加”，会自动进入常用标签池并默认勾选。</div>

      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => toggleTag(name)}
            className={
              selectedSet.has(name)
                ? "rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm text-white"
                : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            }
          >
            {name}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="输入自定义标签，例如：软着陆"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={busy || !custom.trim()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "添加中..." : "添加"}
        </button>
      </div>

      {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}

      {selected.map((name) => (
        <input key={name} type="hidden" name="tagValues" value={name} />
      ))}
    </div>
  );
}

