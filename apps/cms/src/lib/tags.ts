import { prisma } from "@/lib/prisma";

export const DEFAULT_TAGS = ["政策分析", "资产配置", "市场解读", "宏观", "利率", "通胀", "就业", "科技股", "银行", "美元", "债券"];

export function normalizeTagName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeTagKey(name: string) {
  return normalizeTagName(name).toLocaleLowerCase("zh-CN");
}

export function dedupeTagNames(names: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = normalizeTagName(raw);
    if (!name) continue;
    const key = normalizeTagKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export async function getTagOptions() {
  const rows = await prisma.tag.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: { name: true },
  });
  return dedupeTagNames(DEFAULT_TAGS.concat(rows.map((x) => x.name)));
}

export async function upsertTagsByNames(names: string[]) {
  const deduped = dedupeTagNames(names);
  const tags = [];
  for (const name of deduped) {
    const tag = await prisma.tag.upsert({
      where: { normalizedName: normalizeTagKey(name) },
      update: { name },
      create: { name, normalizedName: normalizeTagKey(name) },
      select: { id: true, name: true, normalizedName: true },
    });
    tags.push(tag);
  }
  return tags;
}

export async function syncArticleTags(articleId: string, names: string[]) {
  const tags = await upsertTagsByNames(names);

  await prisma.articleTag.deleteMany({ where: { articleId } });

  if (tags.length) {
    await prisma.articleTag.createMany({
      data: tags.map((tag) => ({ articleId, tagId: tag.id })),
    });
  }

  const canonicalNames = tags.map((t) => t.name);
  await prisma.article.update({
    where: { id: articleId },
    data: { tags: JSON.stringify(canonicalNames) },
  });

  return canonicalNames;
}
