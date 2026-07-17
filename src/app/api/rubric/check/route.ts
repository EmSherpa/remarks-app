import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// GET ?subject=...&grade=...&unitName=...
// Looks for an existing LOCKED rubric for a unit with the same name,
// subject, and grade — so the same unit taught to a different section
// (or in a future quarter) can reuse it instead of generating a new one.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const subject = searchParams.get("subject");
  const grade = searchParams.get("grade");
  const unitName = searchParams.get("unitName");

  if (!subject || !grade || !unitName) {
    return NextResponse.json({ error: "subject, grade, and unitName are required" }, { status: 400 });
  }

  const supabase = supabaseServer();

  // Step 1: find units matching this name/subject/grade (case-insensitive).
  const { data: matchingUnits, error: unitsError } = await supabase
    .from("units")
    .select("id, overview")
    .eq("subject", subject)
    .eq("grade", grade)
    .ilike("name", unitName);

  if (unitsError) return NextResponse.json({ error: unitsError.message }, { status: 500 });
  if (!matchingUnits || matchingUnits.length === 0) {
    return NextResponse.json({ found: false });
  }

  // Step 2: among those units, find the most recent LOCKED rubric.
  const unitIds = matchingUnits.map((u) => u.id);
  const { data: rubrics, error: rubricsError } = await supabase
    .from("rubrics")
    .select("criteria, unit_id, created_at")
    .in("unit_id", unitIds)
    .eq("locked", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (rubricsError) return NextResponse.json({ error: rubricsError.message }, { status: 500 });
  if (!rubrics || rubrics.length === 0) {
    return NextResponse.json({ found: false });
  }

  const matchedUnit = matchingUnits.find((u) => u.id === rubrics[0].unit_id);

  return NextResponse.json({
    found: true,
    criteria: rubrics[0].criteria,
    overview: matchedUnit?.overview ?? "",
  });
}