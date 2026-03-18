import { prisma } from "@/lib/prisma";
import { publicCorsOptions, withPublicCors } from "@/app/api/public/_cors";
import { parseJsonStringArray } from "@/app/api/public/_serialize";

export function OPTIONS() {
  return publicCorsOptions();
}

export async function GET() {
  const rows = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      question: true,
      shortAnswer: true,
      summary: true,
      coverImage: true,
      tags: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
  const items = rows.map((r) => ({
    ...r,
    // Backward/forward compatible for static site consumers.
    short_answer: r.shortAnswer,
    tags: parseJsonStringArray(r.tags),
  }));
  return withPublicCors({ items });
}
