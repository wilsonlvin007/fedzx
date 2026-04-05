"use client";

import React, { useCallback, isValidElement } from "react";

const REQUIRED_FIELDS: [string, string][] = [
  ["title", "标题"],
  ["slug", "Slug"],
  ["question", "Question"],
  ["short_answer", "Short Answer"],
  ["summary", "Summary"],
  ["body", "Body"],
  ["sources", "Sources"],
];

function clearHighlights() {
  document.querySelectorAll(".field-missing").forEach((el) => {
    el.classList.remove("field-missing");
  });
}

function validateAndScroll(): boolean {
  clearHighlights();

  const form = document.getElementById("article-form");
  if (!form) return true;

  let firstEmptyEl: HTMLElement | null = null;

  for (const [name] of REQUIRED_FIELDS) {
    const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
    if (!el || !el.value.trim()) {
      if (!firstEmptyEl) firstEmptyEl = el;
      if (el) el.classList.add("field-missing");
    }
  }

  // Tags: at least 2
  const tagInputs = form.querySelectorAll<HTMLInputElement>('input[name="tagValues"]');
  if (tagInputs.length < 2) {
    const tagsContainer = form.querySelector("[data-tags-section]") as HTMLElement | null;
    if (!firstEmptyEl) firstEmptyEl = tagsContainer;
    if (tagsContainer) tagsContainer.classList.add("field-missing");
  }

  if (firstEmptyEl) {
    firstEmptyEl.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      if (firstEmptyEl instanceof HTMLElement) firstEmptyEl.focus?.();
    }, 400);
    return false;
  }

  return true;
}

export function PreviewButton({ articleId }: { articleId: string }) {
  const handleClick = useCallback(() => {
    if (validateAndScroll()) {
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
 * Injects onSubmit validation into a <form> child element.
 * Does NOT render its own <form> (avoids nested-form bug).
 */
export function PublishGuard({ children }: { children: React.ReactNode }) {
  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    if (!validateAndScroll()) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  if (isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{ onSubmit: React.FormEventHandler<HTMLFormElement> }>,
      { onSubmit: handleSubmit },
    );
  }
  return children;
}
