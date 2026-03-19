import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, verifyPassword, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BodySchema = z
  .object({
    currentPassword: z.string().trim().min(6),
    newPassword: z.string().trim().min(6),
    confirmPassword: z.string().trim().min(6),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "两次输入的新密码不一致" });
    }
  });

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "当前密码不正确" }, { status: 400 });

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true, message: "修改成功" });
}
