import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  email: string;
  role: "ADMIN";
  name: string | null;
};

export type SessionData = {
  user?: SessionUser;
};

declare module "iron-session" {
  interface IronSessionData {
    user?: SessionUser;
  }
}

export const sessionOptions: SessionOptions = {
  cookieName: "fedzx_cms_session",
  password:
    process.env.SESSION_SECRET ??
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("Missing SESSION_SECRET in production");
        })()
      : "dev-only-placeholder-please-set-SESSION_SECRET-32+"),
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
    path: "/",
  },
};

export async function getSession() {
  // Next.js 16+ can make `cookies()` async. If we pass the unresolved value into iron-session,
  // it will crash at runtime with `cookieHandler.get is not a function`.
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
