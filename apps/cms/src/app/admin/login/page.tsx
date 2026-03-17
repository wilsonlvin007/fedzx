import { Suspense } from "react";
import LoginForm from "@/app/admin/login/LoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="text-sm text-slate-500">fedzx.com</div>
            <div className="mt-2 text-slate-900 font-medium">加载中...</div>
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

