import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Not implemented",
      hint: "Phase 2 will call an AI model to generate article drafts and metadata, then require human approval.",
    },
    { status: 501 },
  );
}

