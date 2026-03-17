"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    startTransition(() => {
      router.push("/admin/login");
      router.refresh();
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      type="button"
    >
      退出登录
    </button>
  );
}

