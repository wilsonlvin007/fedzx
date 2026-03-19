import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

const DOC_PATH = "/opt/fedzx/docs/content-guidelines.md";

export function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  try {
    // Force UTF-8 so Chinese doesn't garble.
    const content = await readFile(DOC_PATH, "utf8");
    return jsonWithCors({ title: "GEO 内容生产规范", content });
  } catch (e: any) {
    const code = typeof e?.code === "string" ? e.code : "";
    if (code === "ENOENT") {
      return jsonWithCors({ error: "Not found" }, 404);
    }
    return jsonWithCors({ error: "Internal error" }, 500);
  }
}

function jsonWithCors(payload: unknown, status = 200) {
  const res = NextResponse.json(payload, { status });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "content-type");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function corsOptions() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "content-type");
  res.headers.set("Cache-Control", "public, max-age=86400");
  return res;
}

