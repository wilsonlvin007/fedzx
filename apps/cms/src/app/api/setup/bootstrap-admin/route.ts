import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { env } from "@/lib/env";

const BootstrapSchema = z.object({
  email: z.string().trim().email(),
  // Keep aligned with login. Recommend stronger passwords, but don't block local setup.
  password: z.string().trim().min(6),
  name: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const token = req.headers.get("x-bootstrap-token");
  if (!token || token !== env.BOOTSTRAP_TOKEN()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    return NextResponse.json({ error: "Already bootstrapped" }, { status: 409 });
  }

  const json = await req.json().catch(() => null);
  const parsed = BootstrapSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      role: "ADMIN",
    },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  // Create a default "home" page to mirror the current static landing structure.
  await prisma.page.create({
    data: { key: "home", title: "Home", status: "DRAFT" },
  });

  return NextResponse.json({ ok: true, user });
}
