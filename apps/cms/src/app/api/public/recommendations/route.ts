import { prisma } from "@/lib/prisma";
import { publicCorsOptions, withPublicCors } from "@/app/api/public/_cors";

export function OPTIONS() {
  return publicCorsOptions();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slot = url.searchParams.get("slot") ?? "home";

  const items = await prisma.recommendation.findMany({
    where: { slot, status: "PUBLISHED" },
    orderBy: { order: "asc" },
  });

  return withPublicCors({ slot, items });
}
