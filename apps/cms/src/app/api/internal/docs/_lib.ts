import { readdir, readFile, stat } from "node:fs/promises";
import { join, basename, extname } from "node:path";

export type DocCategory = {
  category: string;
  items: Array<{ title: string; slug: string }>;
};

export type DocResolved = {
  slug: string;
  title: string;
  content: string;
  category: string;
  filePath: string;
};

const DOCS_ROOT = "/opt/fedzx/docs";

type Cache = {
  at: number;
  categories: DocCategory[];
  slugToFile: Record<string, { filePath: string; category: string }>;
};

function getCache(): Cache {
  const g = globalThis as unknown as { __fedzxDocsCache?: Cache };
  if (!g.__fedzxDocsCache) {
    g.__fedzxDocsCache = { at: 0, categories: [], slugToFile: {} };
  }
  return g.__fedzxDocsCache;
}

export async function listDocs(): Promise<{ categories: DocCategory[]; slugToFile: Cache["slugToFile"] }> {
  const cache = getCache();
  const now = Date.now();
  if (cache.at && now - cache.at < 10_000 && cache.categories.length) {
    return { categories: cache.categories, slugToFile: cache.slugToFile };
  }

  const dirs = await safeReadDir(DOCS_ROOT);
  const categoryDirs = dirs
    .filter((d) => d.isDirectory() && /^\d+\-/.test(d.name))
    .map((d) => d.name)
    .sort();

  const categories: DocCategory[] = [];
  const slugToFile: Cache["slugToFile"] = {};

  for (const dirName of categoryDirs) {
    const category = stripPrefix(dirName);
    const dirPath = join(DOCS_ROOT, dirName);
    const files = await safeReadDir(dirPath);
    const mdFiles = files
      .filter((f) => f.isFile() && extname(f.name).toLowerCase() === ".md")
      .map((f) => f.name)
      .sort();

    const items: Array<{ title: string; slug: string }> = [];
    for (const fileName of mdFiles) {
      const slug = basename(fileName, ".md");
      const filePath = join(dirPath, fileName);
      const title = await readTitleFromMarkdown(filePath, slug);
      items.push({ title, slug });
      // Prefer first occurrence if duplicates exist.
      if (!slugToFile[slug]) slugToFile[slug] = { filePath, category };
    }

    categories.push({ category, items });
  }

  cache.at = now;
  cache.categories = categories;
  cache.slugToFile = slugToFile;

  return { categories, slugToFile };
}

export async function resolveDocBySlug(slug: string): Promise<DocResolved | null> {
  const { slugToFile } = await listDocs();
  const hit = slugToFile[slug];
  if (!hit) return null;

  // Force UTF-8 to avoid Chinese garble.
  const content = await readFile(hit.filePath, "utf8");
  const title = readTitleFromString(content) || slug;
  return { slug, title, content, category: hit.category, filePath: hit.filePath };
}

function stripPrefix(dirName: string) {
  return dirName.replace(/^\d+\-/, "");
}

async function safeReadDir(path: string) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function readTitleFromMarkdown(filePath: string, fallback: string) {
  try {
    const s = await readFile(filePath, "utf8");
    return readTitleFromString(s) || fallback;
  } catch {
    try {
      // Fallback: ensure file exists; if not, ignore.
      await stat(filePath);
      return fallback;
    } catch {
      return fallback;
    }
  }
}

function readTitleFromString(md: string) {
  const first = String(md || "").split(/\r?\n/g)[0] || "";
  const m = first.match(/^#\s+(.+)\s*$/);
  return m ? m[1].trim() : "";
}

