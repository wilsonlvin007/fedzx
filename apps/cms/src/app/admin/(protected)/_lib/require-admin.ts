import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export async function requireAdminUser() {
  const session = await getSession();
  if (!session.user?.id) redirect("/admin/login");
  return session.user;
}

