import { NextRequest, NextResponse } from "next/server";
import { consolidateQuarterData } from "@/lib/consolidate";

export async function GET(req: NextRequest) {
  const sectionId = req.nextUrl.searchParams.get("sectionId");
  const quarterId = req.nextUrl.searchParams.get("quarterId");

  if (!sectionId || !quarterId) {
    return NextResponse.json({ error: "sectionId and quarterId are required" }, { status: 400 });
  }

  try {
    const result = await consolidateQuarterData(sectionId, quarterId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 404 });
  }
}