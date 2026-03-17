import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getUserByEmail, verifyPassword } from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().trim().email(),
  // Beginner-friendly: allow 6+ chars (you can raise this to 8/10 later).
  password: z.string().trim().min(6),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const user = await getUserByEmail(parsed.data.email);
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const session = await getSession();
  session.user = { id: user.id, email: user.email, role: "ADMIN", name: user.name ?? null };
  await session.save();

  return NextResponse.json({ ok: true });
}
