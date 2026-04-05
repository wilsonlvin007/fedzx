import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";
import { parseJsonStringArray } from "@/app/api/public/_serialize";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdminUser();
  const { id } = await ctx.params;

  const row = await prisma.article.findUnique({
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

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = { ...row, short_answer: row.shortAnswer, tags: parseJsonStringArray(row.tags) };
  return NextResponse.json({ item });
}
