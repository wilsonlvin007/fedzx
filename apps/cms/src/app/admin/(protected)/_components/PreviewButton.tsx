"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  articleId: string;
};

/**
 * Preview button that validates all required fields before opening the preview page.
 * Required: title, slug, question, short_answer, summary, body, sources, tags
 */
export function PreviewButton({ articleId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleClick = useCallback(() => {
    setError(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const form = document.querySelector("form[action]") as HTMLFormElement | null;
    if (!form) {
      window.open(`/admin/articles/${articleId}/preview`, "_blank");
      return;
    }

    const fd = new FormData(form);
    const missing: string[] = [];

    const checks: [string, string][] = [
      ["title", "标题"],
      ["slug", "Slug"],
      ["question", "Question"],
      ["short_answer", "Short Answer"],
      ["summary", "Summary"],
      ["body", "Body"],
      ["sources", "Sources"],
    ];

    for (const [name, label] of checks) {
      if (!fd.get(name) || !String(fd.get(name)).trim()) {
        missing.push(label);
      }
    }

    // Tags: check hidden inputs named tagValues
    const tagValues = fd.getAll("tagValues").map((t) => String(t).trim()).filter(Boolean);
    if (tagValues.length === 0) {
      missing.push("Tags");
    }

    if (missing.length > 0) {
      setError(`请先填写必填项：${missing.join("、")}`);
      timeoutRef.current = setTimeout(() => setError(null), 5000);
      return;
    }

    window.open(`/admin/articles/${articleId}/preview`, "_blank");
  }, [articleId]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700 hover:bg-blue-100"
      >
        预览
      </button>
      {error && (
        <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-lg border border-red-200 bg-white p-3 shadow-lg">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}
    </div>
  );
}
