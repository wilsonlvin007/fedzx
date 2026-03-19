import { NextResponse } from "next/server";
import { listDocs } from "@/app/api/internal/docs/_lib";

export function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  const { categories } = await listDocs();
  return jsonWithCors(categories);
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

