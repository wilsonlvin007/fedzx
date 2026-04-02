import { NextResponse } from "next/server";
import { resolveDocBySlug } from "@/app/api/internal/docs/_lib";
import { getSession } from "@/lib/session";

export function OPTIONS(req: Request) {
  return corsOptions(req);
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session.user?.id) return jsonWithCors(req, { error: "Unauthorized" }, 401);
  const { slug } = await ctx.params;
  const doc = await resolveDocBySlug(slug);
  if (!doc) return jsonWithCors(req, { error: "Not found" }, 404);
  return jsonWithCors(req, { title: doc.title, content: doc.content, slug: doc.slug, category: doc.category });
}

function jsonWithCors(req: Request, payload: unknown, status = 200) {
  const res = NextResponse.json(payload, { status });
  applyCors(req, res);
  res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "content-type");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function corsOptions(req: Request) {
  const res = new NextResponse(null, { status: 204 });
  applyCors(req, res);
  res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "content-type");
  res.headers.set("Cache-Control", "public, max-age=86400");
  return res;
}

function applyCors(req: Request, res: NextResponse) {
  const origin = req.headers.get("origin");
  if (origin === "https://fedzx.com" || origin === "https://www.fedzx.com") {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Vary", "Origin");
  }
}
