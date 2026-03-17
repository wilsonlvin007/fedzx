import { prisma } from "@/lib/prisma";
import { publicCorsOptions, withPublicCors } from "@/app/api/public/_cors";

export function OPTIONS() {
  return publicCorsOptions();
}

export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const item = await prisma.article.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      body: true,
      coverImage: true,
      tags: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  if (!item) {
    return withPublicCors({ error: "Not found" } as { error: string });
  }
  return withPublicCors({ item });
}
