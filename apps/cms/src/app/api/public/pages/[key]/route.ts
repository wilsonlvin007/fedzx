import { prisma } from "@/lib/prisma";
import { publicCorsOptions, withPublicCors } from "@/app/api/public/_cors";

export function OPTIONS() {
  return publicCorsOptions();
}

export async function GET(_: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const page = await prisma.page.findUnique({
    where: { key },
    select: { id: true, key: true, title: true, status: true },
  });
  if (!page) {
    return withPublicCors({ error: "Not found" } as { error: string });
  }

  const modules = await prisma.pageModule.findMany({
    where: { pageId: page.id, status: "PUBLISHED" },
    orderBy: { order: "asc" },
    select: { id: true, type: true, config: true, order: true },
  });

  return withPublicCors({ page, modules });
}
