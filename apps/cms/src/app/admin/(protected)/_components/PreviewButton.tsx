"use client";

import { useCallback } from "react";

type Props = {
  articleId: string;
};

const REQUIRED_FIELDS: [string, string][] = [
  ["title", "标题"],
  ["slug", "Slug"],
  ["question", "Question"],
  ["short_answer", "Short Answer"],
  ["summary", "Summary"],
  ["body", "Body"],
  ["sources", "Sources"],
];

/**
 * Validates all required fields, scrolls to the first empty one and highlights it.
 * Returns true if all fields are filled.
 */
function validateAndScroll(form: HTMLFormElement): boolean {
  clearHighlights();

  const missing: string[] = [];
  let firstEmptyEl: HTMLElement | null = null;

  for (const [name, _label] of REQUIRED_FIELDS) {
    const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
    if (!el || !el.value.trim()) {
      missing.push(name);
      if (!firstEmptyEl) firstEmptyEl = el;
      if (el) el.classList.add("field-missing");
    }
  }

  // Check tags: at least 2
  const tagInputs = form.querySelectorAll<HTMLInputElement>('input[name="tagValues"]');
  if (tagInputs.length < 2) {
    const tagsContainer = form.querySelector<HTMLInputElement>(
      'input[name="tagValues"]'
    )?.closest("div.block") as HTMLElement | null;
    if (!firstEmptyEl) firstEmptyEl = tagsContainer;
    if (tagsContainer) tagsContainer.classList.add("field-missing");
  }

  if (firstEmptyEl) {
    firstEmptyEl.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      if (firstEmptyEl instanceof HTMLElement) {
        firstEmptyEl.focus?.();
      }
    }, 400);
  }

  return missing.length === 0;
}

function clearHighlights() {
  document.querySelectorAll(".field-missing").forEach((el) => {
    el.classList.remove("field-missing");
  });
}

export function PreviewButton({ articleId }: Props) {
  const handleClick = useCallback(() => {
    const form = document.querySelector<HTMLFormElement>("form[action]");
    if (!form || validateAndScroll(form)) {
      window.open(`/admin/articles/${articleId}/preview`, "_blank");
    }
  }, [articleId]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700 hover:bg-blue-100"
    >
      预览
    </button>
  );
}

/**
 * Wraps a form to validate required fields before the server action runs.
 * Scrolls to and highlights the first empty field.
 */
export function PublishGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      const form = e.currentTarget;
      if (!validateAndScroll(form)) {
        e.preventDefault();
        e.stopPropagation();
      }
      // If valid, let the form submit normally (server action)
    },
    []
  );

  return (
    <form onSubmit={handleSubmit}>
      {children}
    </form>
  );
}
