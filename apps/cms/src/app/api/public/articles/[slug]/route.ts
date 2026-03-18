import { prisma } from "@/lib/prisma";
import { publicCorsOptions, withPublicCors } from "@/app/api/public/_cors";
import { parseJsonStringArray } from "@/app/api/public/_serialize";

export function OPTIONS() {
  return publicCorsOptions();
}

export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const row = await prisma.article.findFirst({
    where: { slug, status: "PUBLISHED" },
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

  if (!row) {
    return withPublicCors({ error: "Not found" } as { error: string });
  }
  const item = { ...row, short_answer: row.shortAnswer, tags: parseJsonStringArray(row.tags) };
  return withPublicCors({ item });
}
