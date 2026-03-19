import PasswordForm from "./PasswordForm";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";

export default async function SettingsPage() {
  await requireAdminUser();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">账户设置</h1>
        <p className="mt-2 text-sm text-slate-600">在这里修改当前登录账号的密码。修改成功后，新密码会在下次登录时生效。</p>
      </div>

      <PasswordForm />
    </div>
  );
}
