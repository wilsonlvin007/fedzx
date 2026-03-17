import { prisma } from "@/lib/prisma";
import { publicCorsOptions, withPublicCors } from "@/app/api/public/_cors";

export function OPTIONS() {
  return publicCorsOptions();
}

export async function GET() {
  const items = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      coverImage: true,
      tags: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
  return withPublicCors({ items });
}
