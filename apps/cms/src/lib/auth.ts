import argon2 from "argon2";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function requireAdmin() {
  const session = await getSession();
  if (!session.user?.id) return null;
  return session.user;
}

export async function verifyPassword(password: string, passwordHash: string) {
  return argon2.verify(passwordHash, password);
}

export async function hashPassword(password: string) {
  return argon2.hash(password);
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

