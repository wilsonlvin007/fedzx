import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { normalizeTagName, normalizeTagKey } from "@/lib/tags";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "标签名不能为空，且长度不能超过 40 个字符" }, { status: 400 });
  }

  const name = normalizeTagName(parsed.data.name);
  if (!name) {
    return NextResponse.json({ error: "标签名不能为空" }, { status: 400 });
  }

  const tag = await prisma.tag.upsert({
    where: { normalizedName: normalizeTagKey(name) },
    update: { name },
    create: { name, normalizedName: normalizeTagKey(name) },
    select: { id: true, name: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, tag });
}
