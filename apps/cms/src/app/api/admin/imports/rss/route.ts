import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Not implemented",
      hint: "Phase 2 will ingest RSS into an inbox table, then map to Article drafts.",
    },
    { status: 501 },
  );
}

