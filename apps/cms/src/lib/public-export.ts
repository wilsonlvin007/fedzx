import { promises as fs } from "fs";
import path from "path";
import MarkdownIt from "markdown-it";
import { prisma } from "@/lib/prisma";

const PUBLIC_ROOT = process.env.PUBLIC_SITE_ROOT || "/var/www/fedzx";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
// 给所有外部链接加 target="_blank" + noopener
const defaultRender =
  md.renderer.rules.link_open ||
  function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
  };
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const href = token.attrGet("href") || "";
  // 外部链接（http/https）才加 blank
  if (/^https?:\/\//.test(href)) {
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noreferrer noopener");
  }
  return defaultRender(tokens, idx, options, env, self);
};

/**
 * 中文写作习惯用单换行分段，但 Markdown 规范要求空行分段。
 * 此函数在连续的纯文本行之间自动插入空行，确保正确生成 <p> 标签。
 */
function normalizeParagraphs(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      const prev = lines[i - 1].trimEnd();
      const curr = lines[i].trimStart();
      const isTextLine = (s: string) =>
        s.length > 0 &&
        !s.startsWith("#") &&
        !/^[-*+]\s/.test(s) &&
        !/^\d+\.\s/.test(s) &&
        !s.startsWith(">") &&
        !s.startsWith("|") &&
        !s.startsWith("```") &&
        !/^[-*_]{3,}$/.test(s);
      if (prev && curr && isTextLine(prev) && isTextLine(curr)) {
        out.push("");
      }
    }
    out.push(lines[i]);
  }
  return out.join("\n");
}

type PublicArticle = {
  id: string;
  slug: string;
  title: string;
  question: string | null;
  shortAnswer: string | null;
  summary: string | null;
  body: string;
  sources: string | null;
  coverImage: string | null;
  tags: string;
  publishedAt: Date | null;
  updatedAt: Date;
};

export async function exportPublicSite() {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
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
    },
  });

  await fs.mkdir(path.join(PUBLIC_ROOT, "articles"), { recursive: true });
  await fs.mkdir(path.join(PUBLIC_ROOT, "questions"), { recursive: true });

  const publishedSlugs = new Set(articles.map((a) => a.slug));
  await cleanupOldArticleDirs(publishedSlugs);

  for (const article of articles) {
    const outDir = path.join(PUBLIC_ROOT, "articles", article.slug);
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, "index.html"), renderArticlePage(article, articles), "utf8");
  }

  await fs.writeFile(path.join(PUBLIC_ROOT, "articles", "index.html"), renderArticlesIndex(articles), "utf8");
  await fs.writeFile(path.join(PUBLIC_ROOT, "questions", "index.html"), renderQuestionsIndex(articles), "utf8");
  await fs.writeFile(path.join(PUBLIC_ROOT, "sitemap.xml"), renderSitemap(articles), "utf8");
}

async function cleanupOldArticleDirs(validSlugs: Set<string>) {
  const articlesDir = path.join(PUBLIC_ROOT, "articles");
  const entries = await fs.readdir(articlesDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (validSlugs.has(entry.name)) continue;
    await fs.rm(path.join(articlesDir, entry.name), { recursive: true, force: true });
  }
}

function renderArticlePage(article: PublicArticle, all: PublicArticle[]) {
  const tags = parseTags(article.tags);
  const related = all.filter((item) => item.slug !== article.slug).slice(0, 3);
  const description = article.summary || article.shortAnswer || article.question || article.title;
  const canonical = absoluteUrl(articlePath(article.slug));
  const bodyHtml = md.render(normalizeParagraphs(article.body || ""));
  const sourcesHtml = renderSources(article.sources || "");
  const relatedHtml = related
    .map(
      (item) => `
        <a class="rel-card" href="${articlePath(item.slug)}">
          <div class="rel-card-title">${escapeHtml(item.title)}</div>
          <div class="rel-card-date">${escapeHtml(formatDate(item.publishedAt))}</div>
          <span class="rel-card-arrow">→</span>
        </a>`,
    )
    .join("");
  const tagsHtml = tags.length
    ? `<div id="article-tags"><div class="tags-section-label">标签</div><div id="article-tags-list">${tags
        .map((tag, index) => `<span class="art-header-tag art-header-tag-${index % 6}">${escapeHtml(tag)}</span>`)
        .join("")}</div></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(article.title)} - FedZX</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(article.title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta name="twitter:card" content="summary_large_image" />
  ${sharedHead()}
  ${articleStyles()}
</head>
<body>
${siteHeader("articles")}
<main>
  <div class="article-wrap">
    <a class="back-link" href="/articles/">← 返回文章列表</a>
    <article style="margin-top:28px;">
      <header>
        ${tags.length ? `<div class="art-header-tags">${tags
          .map((tag, index) => `<span class="art-header-tag art-header-tag-${index % 6}">${escapeHtml(tag)}</span>`)
          .join("")}</div>` : ""}
        <h1 id="article-title">${escapeHtml(article.title)}</h1>
        <div class="art-meta-row">
          <span>${escapeHtml(formatDate(article.publishedAt))}</span>
          <span class="art-meta-dot">·</span>
          <span id="article-slug">${escapeHtml(article.slug)}</span>
        </div>
        ${
          article.shortAnswer
            ? `<div class="short-answer-card">
                <div class="answer-box-label">👉 核心结论</div>
                <div id="article-short-answer-text">${escapeHtml(article.shortAnswer)}</div>
              </div>`
            : ""
        }
        ${
          article.shortAnswer && article.summary
            ? `<div id="article-summary">
                <div style="font-size:0.72rem;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">摘要</div>
                <div style="font-size:0.95rem;color:#374151;line-height:1.8;">${escapeHtml(article.summary)}</div>
              </div>`
            : ""
        }
      </header>
      <div id="article-body" class="article-body" style="margin-top:32px;">${bodyHtml}</div>
      ${sourcesHtml}
      ${tagsHtml}
      <section class="related-section">
        <div class="related-section-title">相关推荐</div>
        <div id="article-related">${relatedHtml || `<div style="padding:30px 0;color:#9CA3AF;font-size:0.9rem;text-align:center;">暂无相关推荐</div>`}</div>
      </section>
    </article>
  </div>
</main>
${siteFooter()}
</body>
</html>`;
}

function renderArticlesIndex(articles: PublicArticle[]) {
  const cards = articles
    .map((article) => {
      const tags = parseTags(article.tags);
      const keyTakeaway = article.shortAnswer || article.summary || "";
      return `<a class="art-card" href="${articlePath(article.slug)}">
        <div class="art-title">${escapeHtml(article.title)}</div>
        ${
          keyTakeaway
            ? `<div class="art-takeaway">
                <div class="art-takeaway-label">核心结论</div>
                <div class="art-takeaway-text">${escapeHtml(keyTakeaway)}</div>
              </div>`
            : ""
        }
        <div class="art-meta">${article.publishedAt ? `<span class="art-date">📅 ${escapeHtml(formatDate(article.publishedAt))}</span>` : ""}</div>
        ${tags.length ? `<div class="art-tags">${tags.map((tag, index) => `<span class="art-tag art-tag-${index % 6}">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        <span class="art-arrow">→</span>
      </a>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>最新文章 - FedZX</title>
  <meta name="description" content="深度解读美联储政策、宏观经济数据与全球资产配置。" />
  <link rel="canonical" href="${absoluteUrl("/articles/")}" />
  ${sharedHead()}
  ${listStyles()}
</head>
<body>
${siteHeader("articles")}
<section class="page-hero">
  <div class="container" style="max-width:860px;">
    <div class="page-hero-badge">📰 内容中心</div>
    <h1>最新文章</h1>
    <p>深度解读美联储政策、宏观经济数据与全球资产配置</p>
  </div>
</section>
<main class="articles-section">
  <div class="articles-count">共 ${articles.length} 篇文章</div>
  <div id="articles-list">${cards || '<div class="state-empty">暂无已发布文章</div>'}</div>
</main>
${siteFooter()}
</body>
</html>`;
}

function renderQuestionsIndex(articles: PublicArticle[]) {
  const questionItems = articles.filter((article) => article.question && article.slug);
  const cards = questionItems
    .map((article, index) => {
      const tags = parseTags(article.tags).slice(0, 2);
      return `<a class="question-card" href="${articlePath(article.slug)}">
        <div class="question-meta">
          <span class="question-badge">Q</span>
          ${tags.map((tag) => `<span class="question-tag">${escapeHtml(tag)}</span>`).join("")}
          ${index === 0 ? '<span class="question-tag is-hot">热榜</span>' : ""}
        </div>
        <div class="question-title">${escapeHtml(article.question || article.title)}</div>
        ${
          article.shortAnswer
            ? `<div class="question-summary">
                <div class="question-summary-label">核心结论</div>
                <div class="question-summary-text">${escapeHtml(article.shortAnswer)}</div>
              </div>`
            : ""
        }
        <span class="question-arrow">→</span>
      </a>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>热门问题 - FedZX</title>
  <meta name="description" content="聚焦用户最常关心的利率、通胀、资产配置与市场影响问题。" />
  <link rel="canonical" href="${absoluteUrl("/questions/")}" />
  ${sharedHead()}
  ${questionsStyles()}
</head>
<body>
${siteHeader("questions")}
<section class="page-hero">
  <div class="container" style="max-width:860px;">
    <div class="page-hero-badge">❓ 问答中心</div>
    <h1>热门问题</h1>
    <p>聚焦用户最常关心的利率、通胀、资产配置与市场影响问题，优先展示已经整理成文的高价值问答内容。</p>
  </div>
</section>
<main class="questions-section">
  <div class="questions-count">共 ${questionItems.length} 个热门问题</div>
  <div id="questions-list">${cards || '<div class="state-empty">暂无热门问题</div>'}</div>
</main>
${siteFooter()}
</body>
</html>`;
}

function renderSitemap(articles: PublicArticle[]) {
  const urls = [
    "/",
    "/articles/",
    "/questions/",
    "/about/",
    ...articles.map((article) => articlePath(article.slug)),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((url) => {
    return `  <url><loc>${absoluteUrl(url)}</loc></url>`;
  })
  .join("\n")}
</urlset>`;
}

export function articlePath(slug: string) {
  return `/articles/${encodeURIComponent(slug)}/`;
}

function absoluteUrl(pathname: string) {
  return `https://fedzx.com${pathname}`;
}

function parseTags(tags: string) {
  try {
    const value = JSON.parse(tags) as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(date);
}

function renderSources(sources: string) {
  const lines = String(sources || "")
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "";

  return `<section id="article-sources">
    <h2>延伸阅读</h2>
    <ul id="article-sources-list">${lines.map((line) => renderSourceLine(line)).join("")}</ul>
  </section>`;
}

function renderSourceLine(line: string) {
  const mdMatch = line.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)(?:\s*[—-]\s*(.+))?$/);
  if (mdMatch) {
    const [, title, url, meta] = mdMatch;
    return `<li><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(title)}</a>${
      meta ? ` <span style="color:#9CA3AF;">— ${escapeHtml(meta)}</span>` : ""
    }</li>`;
  }
  return `<li>${escapeHtml(line)}</li>`;
}

function sharedHead() {
  return `
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <meta name="theme-color" content="#2563EB">`;
}

function siteHeader(active: "articles" | "questions" | "home") {
  return `<header class="site-header">
    <div class="container nav-inner">
      <a href="/" class="logo-wrap" style="text-decoration:none;">
        <svg height="34" viewBox="0 0 152 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="40" height="40" rx="8" fill="#2563EB"/>
          <rect x="9" y="11" width="22" height="4" rx="2" fill="white"/>
          <rect x="9" y="18" width="22" height="4" rx="2" fill="white"/>
          <rect x="9" y="25" width="14" height="4" rx="2" fill="white"/>
          <text x="50" y="27" font-family="'PingFang SC','Inter',system-ui,sans-serif" font-size="21" font-weight="800" letter-spacing="-0.5" fill="#1C2B3A">Fed</text>
          <text x="85" y="27" font-family="'PingFang SC','Inter',system-ui,sans-serif" font-size="21" font-weight="800" letter-spacing="-0.5" fill="#2563EB">ZX</text>
        </svg>
      </a>
      <nav>
        <ul class="nav-links">
          <li><a href="/"${active === "home" ? ' class="active"' : ""}>首页</a></li>
          <li><a href="/articles/"${active === "articles" ? ' class="active"' : ""}>最新文章</a></li>
          <li><a href="/questions/"${active === "questions" ? ' class="active"' : ""}>热门问题</a></li>
          <li><a href="https://cms.fedzx.com/admin/login" class="nav-cta">管理</a></li>
        </ul>
      </nav>
    </div>
  </header>`;
}

function siteFooter() {
  return `<footer style="background:#0F1B2D;padding:40px 0 28px;">
      <div style="max-width:900px;margin:0 auto;padding:0 24px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <svg height="30" viewBox="0 0 152 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="40" height="40" rx="8" fill="#2563EB"/>
            <rect x="9" y="11" width="22" height="4" rx="2" fill="white"/>
            <rect x="9" y="18" width="22" height="4" rx="2" fill="white"/>
            <rect x="9" y="25" width="14" height="4" rx="2" fill="white"/>
            <text x="50" y="27" font-family="'PingFang SC','Inter',system-ui,sans-serif" font-size="21" font-weight="800" letter-spacing="-0.5" fill="#F0F6FF">Fed</text>
            <text x="85" y="27" font-family="'PingFang SC','Inter',system-ui,sans-serif" font-size="21" font-weight="800" letter-spacing="-0.5" fill="#38BDF8">ZX</text>
          </svg>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;text-align:center;">
          <p style="color:rgba(255,255,255,0.28);font-size:0.78rem;margin:0;">
            © 2026 FedZX.com · 内容仅供参考，不构成投资建议 |
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" style="color:#38BDF8;">京ICP备17065765号</a>
          </p>
        </div>
      </div>
    </footer>`;
}

function baseStyles() {
  return `<style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scrollbar-gutter: stable; }
    body { margin: 0; background: #FFFFFF; color: #374151; font-family: 'PingFang SC', 'Noto Sans SC', 'Inter', system-ui, sans-serif; overflow-y: scroll; }
    .site-header { background: #fff; border-bottom: 1px solid #E5E7EB; box-shadow: 0 1px 3px rgba(28,43,58,.05); position: sticky; top: 0; z-index: 200; }
    .site-header::before { content: ''; display: block; height: 3px; background: linear-gradient(90deg, #2563EB 0%, #38BDF8 100%); }
    .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    .nav-inner { display: grid; grid-template-columns: auto 1fr; align-items: center; column-gap: 24px; height: 58px; }
    .nav-inner nav { width: 388px; justify-self: end; display: flex; justify-content: flex-end; }
    .logo-wrap { display: flex; align-items: center; cursor: pointer; }
    .nav-links { display: grid; grid-template-columns: 88px 88px 88px 100px; column-gap: 2px; list-style: none; align-items: center; justify-content: end; margin: 0; padding: 0; }
    .nav-links li { display: flex; justify-content: center; }
    .nav-links a { display: inline-flex; align-items: center; justify-content: center; min-width: 74px; color: #6B7280; font-size: 0.88rem; font-weight: 500; padding: 6px 14px; border-radius: 6px; transition: all 0.18s ease; text-decoration: none; }
    .nav-links a:hover { color: #2563EB; background: rgba(37,99,235,0.08); }
    .nav-links a.active { color: #2563EB; font-weight: 600; }
    .nav-cta { background: #2563EB !important; color: #fff !important; border-radius: 10px !important; padding: 7px 18px !important; font-weight: 600 !important; font-size: 0.85rem !important; transition: all 0.18s ease !important; }
    .nav-cta:hover { background: #1D4ED8 !important; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(37,99,235,0.25) !important; }
    .page-hero { background: linear-gradient(135deg, #0F1B2D 0%, #1a2e4a 60%, #1e3a5f 100%); padding: 52px 0 44px; position: relative; overflow: hidden; }
    .page-hero::after { content: ''; position: absolute; right: -80px; top: -60px; width: 320px; height: 320px; background: radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 65%); pointer-events: none; }
    .page-hero-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); color: #38BDF8; font-size: 0.72rem; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px; letter-spacing: 0.3px; }
    .page-hero h1 { color: #F0F6FF; font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 8px; }
    .page-hero p { color: rgba(240,246,255,0.55); font-size: 0.93rem; margin: 0; }
  </style>`;
}

function listStyles() {
  return `${baseStyles()}<style>
    .articles-section { max-width: 860px; margin: 0 auto; padding: 36px 24px 60px; }
    .articles-count { font-size: 0.82rem; color: #9CA3AF; margin-bottom: 18px; }
    .art-card { display: block; text-decoration: none; background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; padding: 24px 52px 24px 28px; margin-bottom: 14px; transition: all 0.22s cubic-bezier(0.4,0,0.2,1); position: relative; overflow: hidden; }
    .art-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #2563EB; border-radius: 14px 0 0 14px; transform: scaleY(0); transform-origin: bottom; transition: transform 0.22s cubic-bezier(0.4,0,0.2,1); }
    .art-card:hover { border-color: #BFDBFE; box-shadow: 0 8px 28px rgba(37,99,235,0.1); transform: translateY(-2px); }
    .art-card:hover::before { transform: scaleY(1); }
    .art-title { font-size: 1.08rem; font-weight: 700; color: #1C2B3A; line-height: 1.45; margin: 0 0 10px; transition: color 0.15s; }
    .art-card:hover .art-title { color: #2563EB; }
    .art-takeaway { background: #F8FAFD; border: 1px solid #E5E7EB; border-radius: 9px; padding: 11px 14px; margin: 12px 0; }
    .art-takeaway-label { font-size: 0.7rem; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .art-takeaway-text { font-size: 0.875rem; font-weight: 600; color: #374151; line-height: 1.6; }
    .art-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    .art-date { font-size: 0.78rem; color: #9CA3AF; }
    .art-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
    .art-tag { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
    .art-tag-0 { background: #EFF6FF; color: #2563EB; }
    .art-tag-1 { background: #FFF7ED; color: #C2410C; }
    .art-tag-2 { background: #F0FDF4; color: #15803D; }
    .art-tag-3 { background: #FDF4FF; color: #7E22CE; }
    .art-tag-4 { background: #FFFBEB; color: #B45309; }
    .art-tag-5 { background: #F0F9FF; color: #0369A1; }
    .art-arrow { position: absolute; right: 22px; top: 50%; transform: translateY(-50%) translateX(6px); color: #9CA3AF; opacity: 0; transition: all 0.22s; font-size: 18px; }
    .art-card:hover .art-arrow { opacity: 1; transform: translateY(-50%) translateX(0); }
    .state-empty { text-align: center; padding: 56px 24px; color: #9CA3AF; font-size: 0.95rem; }
  </style>`;
}

function questionsStyles() {
  return `${baseStyles()}<style>
    .questions-section { max-width: 860px; margin: 0 auto; padding: 36px 24px 60px; }
    .questions-count { font-size: 0.82rem; color: #9CA3AF; margin-bottom: 18px; }
    .question-card { display: block; text-decoration: none; background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; padding: 24px 52px 24px 28px; margin-bottom: 14px; position: relative; overflow: hidden; transition: all 0.22s cubic-bezier(0.4,0,0.2,1); }
    .question-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #2563EB; border-radius: 14px 0 0 14px; transform: scaleY(0); transform-origin: bottom; transition: transform 0.22s cubic-bezier(0.4,0,0.2,1); }
    .question-card:hover { border-color: #BFDBFE; box-shadow: 0 8px 28px rgba(37,99,235,0.1); transform: translateY(-2px); }
    .question-card:hover::before { transform: scaleY(1); }
    .question-title { font-size: 1.08rem; font-weight: 700; color: #1C2B3A; line-height: 1.45; margin: 0 0 10px; transition: color 0.15s; }
    .question-card:hover .question-title { color: #2563EB; }
    .question-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .question-badge { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 999px; background: #EFF6FF; color: #2563EB; font-size: 0.78rem; font-weight: 700; }
    .question-tag { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 20px; background: #F8FAFD; color: #475569; font-size: 0.72rem; font-weight: 600; border: 1px solid #E5E7EB; }
    .question-tag.is-hot { background: #FFF7ED; color: #C2410C; border-color: #FED7AA; }
    .question-summary { background: #F8FAFD; border: 1px solid #E5E7EB; border-radius: 9px; padding: 11px 14px; margin: 12px 0; }
    .question-summary-label { font-size: 0.7rem; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .question-summary-text { font-size: 0.875rem; font-weight: 600; color: #374151; line-height: 1.6; }
    .question-arrow { position: absolute; right: 22px; top: 50%; transform: translateY(-50%) translateX(6px); color: #9CA3AF; opacity: 0; transition: all 0.22s; font-size: 18px; }
    .question-card:hover .question-arrow { opacity: 1; transform: translateY(-50%) translateX(0); }
    .state-empty { text-align: center; padding: 56px 24px; color: #9CA3AF; font-size: 0.95rem; }
  </style>`;
}

function articleStyles() {
  return `${baseStyles()}<style>
    body { background: #F8FAFD; color: #374151; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 500; color: #6B7280; text-decoration: none; padding: 6px 0; transition: color 0.15s; }
    .back-link:hover { color: #2563EB; }
    .article-wrap { max-width: 780px; margin: 0 auto; padding: 36px 24px 72px; }
    .art-header-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 18px; }
    .art-header-tag { display: inline-block; padding: 3px 11px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
    .art-header-tag-0 { background: #EFF6FF; color: #2563EB; }
    .art-header-tag-1 { background: #FFF7ED; color: #C2410C; }
    .art-header-tag-2 { background: #F0FDF4; color: #15803D; }
    .art-header-tag-3 { background: #FDF4FF; color: #7E22CE; }
    .art-header-tag-4 { background: #FFFBEB; color: #B45309; }
    .art-header-tag-5 { background: #F0F9FF; color: #0369A1; }
    #article-title { font-size: 2rem; font-weight: 800; color: #0F1B2D; line-height: 1.3; letter-spacing: -0.5px; margin: 0 0 16px; }
    .art-meta-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 0.82rem; color: #9CA3AF; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #E5E7EB; }
    .art-meta-dot { color: #D1D5DB; }
    #article-slug { font-family: monospace; font-size: 0.75rem; color: #D1D5DB; }
    .short-answer-card { background: linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%); border: 1px solid #BFDBFE; border-left: 4px solid #2563EB; border-radius: 12px; padding: 20px 22px; margin-bottom: 28px; }
    .answer-box-label { font-size: 0.72rem; font-weight: 800; color: #2563EB; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
    #article-short-answer-text { font-size: 1rem; font-weight: 600; color: #1C2B3A; line-height: 1.7; }
    #article-summary { background: #F8FAFD; border: 1px solid #E5E7EB; border-radius: 10px; padding: 18px 20px; margin-bottom: 28px; }
    .article-body { line-height: 1.9; font-size: 1rem; color: #374151; }
    .article-body h1, .article-body h2 { color: #0F1B2D; font-weight: 800; margin: 2em 0 0.6em; }
    .article-body h2 { font-size: 1.3rem; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px; }
    .article-body h3 { font-size: 1.1rem; color: #1C2B3A; font-weight: 700; margin: 1.6em 0 0.5em; }
    .article-body p { margin: 0 0 1.2em; }
    .article-body ul, .article-body ol { padding-left: 1.5em; margin: 0 0 1.2em; }
    .article-body li { margin-bottom: 0.4em; }
    .article-body blockquote { border-left: 4px solid #2563EB; background: #EFF6FF; margin: 1.5em 0; padding: 14px 18px; border-radius: 0 8px 8px 0; color: #1D4ED8; font-style: italic; }
    .article-body code { background: #F1F5F9; color: #0F172A; padding: 2px 6px; border-radius: 4px; font-size: 0.88em; }
    .article-body strong { color: #0F1B2D; }
    .article-body table { width: 100%; border-collapse: collapse; margin: 1.5em 0; font-size: 0.92rem; }
    .article-body th, .article-body td { border: 1px solid #E5E7EB; padding: 10px 14px; text-align: left; vertical-align: top; }
    .article-body th { background: #F8FAFD; font-weight: 700; color: #0F1B2D; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.3px; }
    .article-body tr:nth-child(even) td { background: #FAFBFC; }
    .article-body pre { background: #1E293B; color: #E2E8F0; padding: 18px 20px; border-radius: 10px; overflow-x: auto; margin: 1.5em 0; font-size: 0.88rem; line-height: 1.7; }
    .article-body pre code { background: none; color: inherit; padding: 0; font-size: inherit; }
    .article-body hr { border: none; border-top: 2px solid #E5E7EB; margin: 2em 0; }
    .article-body img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
    #article-sources { background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 22px 24px; margin-top: 40px; }
    #article-sources h2 { font-size: 1rem; font-weight: 700; color: #1C2B3A; margin: 0 0 14px; }
    #article-sources-list { list-style: none; padding: 0; margin: 0; }
    #article-sources-list li { font-size: 0.875rem; color: #6B7280; padding: 6px 0; border-bottom: 1px solid #F3F4F6; }
    #article-sources-list li:last-child { border-bottom: none; }
    #article-sources-list a { color: #2563EB; text-decoration: none; }
    #article-sources-list a:hover { text-decoration: underline; }
    #article-tags { margin-top: 36px; }
    .tags-section-label { font-size: 0.78rem; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    #article-tags-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .related-section { margin-top: 52px; }
    .related-section-title { font-size: 1.1rem; font-weight: 800; color: #0F1B2D; margin-bottom: 18px; padding-bottom: 10px; border-bottom: 2px solid #E5E7EB; }
    .rel-card { display: block; text-decoration: none; background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px 48px 18px 20px; margin-bottom: 12px; position: relative; overflow: hidden; transition: all 0.2s cubic-bezier(0.4,0,0.2,1); }
    .rel-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #2563EB; border-radius: 12px 0 0 12px; transform: scaleY(0); transform-origin: bottom; transition: transform 0.2s cubic-bezier(0.4,0,0.2,1); }
    .rel-card:hover { border-color: #BFDBFE; box-shadow: 0 6px 22px rgba(37,99,235,0.09); transform: translateY(-2px); }
    .rel-card:hover::before { transform: scaleY(1); }
    .rel-card-title { font-size: 0.95rem; font-weight: 700; color: #1C2B3A; line-height: 1.4; transition: color 0.15s; }
    .rel-card:hover .rel-card-title { color: #2563EB; }
    .rel-card-date { font-size: 0.75rem; color: #9CA3AF; margin-top: 6px; }
    .rel-card-arrow { position: absolute; right: 18px; top: 50%; transform: translateY(-50%) translateX(5px); color: #9CA3AF; opacity: 0; font-size: 16px; transition: all 0.2s; }
    .rel-card:hover .rel-card-arrow { opacity: 1; transform: translateY(-50%) translateX(0); }
  </style>`;
}
