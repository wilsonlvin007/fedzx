import { NextResponse } from "next/server";

export function withPublicCors<T>(payload: T, status = 200) {
  const res = NextResponse.json(payload, { status });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "content-type");
  res.headers.set("Cache-Control", "public, max-age=30");
  return res;
}

export function publicCorsOptions() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "content-type");
  res.headers.set("Cache-Control", "public, max-age=86400");
  return res;
}
