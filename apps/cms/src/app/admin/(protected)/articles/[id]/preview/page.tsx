import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";
import { parseJsonStringArray } from "@/app/api/public/_serialize";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "文章预览 - FedZX CMS",
};

export default async function PreviewArticlePage(props: { params: Promise<{ id: string }> }) {
  await requireAdminUser();
  const { id } = await props.params;

  const article = await prisma.article.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      question: true,
      shortAnswer: true,
      summary: true,
      body: true,
      sources: true,
      coverImage: true,
      tags: true,
      publishedAt: true,
      updatedAt: true,
      status: true,
    },
  });

  if (!article) {
    notFound();
  }

  const tags = parseJsonStringArray(article.tags);

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto">
      {/* Preview banner */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            预览模式
          </span>
          <span className="text-gray-500">
            状态: <span className="font-medium text-gray-900">{article.status}</span>
          </span>
        </div>
        <a
          href={`/admin/articles/${id}`}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
        >
          ← 返回编辑
        </a>
      </div>

      {/* Article content rendered exactly like the frontend */}
      <div className="mx-auto max-w-[800px] px-4 py-10" style={{ fontFamily: '"Noto Sans SC", sans-serif' }}>
        <a className="text-sm text-gray-700 hover:text-gray-900 cursor-default">← 返回文章列表</a>

        <article className="mt-6">
          <header>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900">
              {article.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {article.publishedAt ? (
                <span>{formatDateTime(article.publishedAt)}</span>
              ) : (
                <span>未发布</span>
              )}
              <span className="text-gray-300">·</span>
              <span className="font-mono">{article.slug}</span>
            </div>

            {/* Short answer card */}
            {(article.shortAnswer || (!article.shortAnswer && article.summary)) && (
              <div className="mt-6">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div className="text-xs font-semibold text-gray-600">核心结论</div>
                  <div className="mt-2 text-sm text-gray-900 leading-relaxed">
                    {article.shortAnswer || article.summary}
                  </div>
                </div>
              </div>
            )}

            {/* Summary block - show only when shortAnswer also exists */}
            {article.shortAnswer && article.summary && (
              <div className="mt-5">
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="text-xs font-semibold text-gray-600">摘要</div>
                  <div className="mt-2 text-sm text-gray-900 leading-relaxed">{article.summary}</div>
                </div>
              </div>
            )}
          </header>

          {/* Body */}
          <div
            className="article-body mt-8"
            style={{
              fontSize: "16px",
              lineHeight: "1.9",
              color: "#111827",
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }}
          />

          {/* Sources */}
          {article.sources && article.sources.trim() && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-gray-900">Sources</h2>
              <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-5">
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-800">
                  {article.sources
                    .split(/\r?\n/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                </ul>
              </div>
            </section>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-8">
              <div className="text-sm font-semibold text-gray-900">标签</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.slice(0, 12).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>

      {/* Inline styles that mirror the frontend styles.css article-body rules */}
      <style jsx global>{`
        .article-body p {
          margin-top: 16px;
          white-space: pre-wrap;
        }
        .article-body p:first-child {
          margin-top: 0;
        }
        .article-body h1,
        .article-body h2,
        .article-body h3 {
          margin-top: 32px;
          font-weight: 700;
          line-height: 1.3;
          color: #111827;
        }
        .article-body h1:first-child,
        .article-body h2:first-child,
        .article-body h3:first-child {
          margin-top: 0;
        }
        .article-body h1 {
          font-size: 30px;
        }
        .article-body h2 {
          font-size: 24px;
        }
        .article-body h3 {
          font-size: 20px;
        }
        .article-body ul,
        .article-body ol {
          margin-top: 16px;
          padding-left: 24px;
        }
        .article-body li {
          margin-top: 8px;
        }
        .article-body blockquote {
          margin-top: 20px;
          border-left: 4px solid #d1d5db;
          background: #f9fafb;
          padding: 12px 16px;
          color: #374151;
        }
        .article-body pre {
          margin-top: 20px;
          overflow: auto;
          border-radius: 16px;
          background: #111827;
          padding: 16px;
          color: #f9fafb;
        }
        .article-body code {
          border-radius: 6px;
          background: #f3f4f6;
          padding: 2px 6px;
          font-size: 0.92em;
        }
        .article-body pre code {
          background: transparent;
          padding: 0;
          color: inherit;
        }
        .article-body hr {
          margin-top: 24px;
          border: none;
          border-top: 1px solid #e5e7eb;
        }
        .article-body .table-wrap {
          margin-top: 20px;
          overflow-x: auto;
        }
        .article-body table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #e5e7eb;
          background: #fff;
        }
        .article-body th,
        .article-body td {
          border: 1px solid #e5e7eb;
          padding: 10px 12px;
          vertical-align: top;
        }
        .article-body th {
          background: #f9fafb;
          font-weight: 700;
        }
        .article-body strong {
          font-weight: 700;
        }
        .article-body em {
          font-style: italic;
        }
        .article-body a {
          color: #2563eb;
          text-decoration: none;
        }
        .article-body a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

/**
 * Server-side markdown renderer that mirrors the frontend's markdown-lite.js
 * exactly. This ensures the preview matches what visitors see on fedzx.com.
 */
function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let i = 0;

  function flushCode() {
    if (!inCode) return;
    out.push("<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
    inCode = false;
    codeLines = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    // fenced code blocks
    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
        codeLines = [];
      }
      i++;
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      i++;
      continue;
    }

    // hr
    if (/^\s*---\s*$/.test(line)) {
      out.push("<hr/>");
      i++;
      continue;
    }

    // headings
    const h = line.match(/^(#{1,3})\s+(.+)\s*$/);
    if (h) {
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      i++;
      continue;
    }

    // blockquote
    const bq = line.match(/^\s*>\s?(.*)$/);
    if (bq) {
      out.push(`<blockquote><p>${inline(bq[1])}</p></blockquote>`);
      i++;
      continue;
    }

    // tables
    if (isTableHeaderBlock(lines, i)) {
      const headerCells = splitTableRow(lines[i]);
      const separatorCells = splitTableRow(lines[i + 1]);
      const aligns = separatorCells.map(getTableAlign);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].indexOf("|") !== -1) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      out.push(
        '<div class="table-wrap"><table><thead><tr>' +
          headerCells.map((cell, idx) => `<th${aligns[idx] || ""}>${inline(cell)}</th>`).join("") +
          "</tr></thead><tbody>" +
          rows
            .map(
              (row) =>
                "<tr>" +
                headerCells.map((_c, idx) => `<td${aligns[idx] || ""}>${inline(row[idx] || "")}</td>`).join("") +
                "</tr>",
            )
            .join("") +
          "</tbody></table></div>",
      );
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push("<ul>" + items.map((x) => `<li>${inline(x)}</li>`).join("") + "</ul>");
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push("<ol>" + items.map((x) => `<li>${inline(x)}</li>`).join("") + "</ol>");
      continue;
    }

    // blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // paragraph
    const p = [line.trimEnd()];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*---\s*$/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !isTableHeaderBlock(lines, i)
    ) {
      p.push(lines[i].trimEnd());
      i++;
    }
    out.push(`<p>${inline(p.join("\n"))}</p>`);
  }

  flushCode();
  return out.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inline(md: string): string {
  let s = escapeHtml(md);
  // inline code
  s = s.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${escapeHtml(code)}</code>`);
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?:;])/g, "$1<em>$2</em>");
  s = s.replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?:;])/g, "$1<em>$2</em>");
  // links
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m: string, text: string, url: string) =>
      `<a href="${String(url).replace(/"/g, "%22")}" target="_blank" rel="noreferrer">${text}</a>`,
  );
  return s;
}

function splitTableRow(line: string): string[] {
  let row = (line || "").trim();
  if (row[0] === "|") row = row.slice(1);
  if (row[row.length - 1] === "|") row = row.slice(0, -1);
  return row.split("|").map((c) => c.trim());
}

function isTableSeparatorLine(line: string): boolean {
  const cells = splitTableRow(line);
  if (!cells.length) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isTableHeaderBlock(lines: string[], index: number): boolean {
  if (index + 1 >= lines.length) return false;
  return lines[index].indexOf("|") !== -1 && lines[index + 1].indexOf("|") !== -1 && isTableSeparatorLine(lines[index + 1]);
}

function getTableAlign(cell: string): string {
  if (/^:-+:$/.test(cell)) return ' style="text-align:center"';
  if (/^-+:$/.test(cell)) return ' style="text-align:right"';
  if (/^:-+$/.test(cell)) return ' style="text-align:left"';
  return "";
}
