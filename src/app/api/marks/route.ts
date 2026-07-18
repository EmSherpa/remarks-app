import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// GET ?rubricId=...&quarterId=... → existing marks for that rubric+quarter
export async function GET(req: NextRequest) {
  const rubricId = req.nextUrl.searchParams.get("rubricId");
  const quarterId = req.nextUrl.searchParams.get("quarterId");

  if (!rubricId || !quarterId) {
    return NextResponse.json({ error: "rubricId and quarterId are required" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("marks")
    .select("*")
    .eq("rubric_id", rubricId)
    .eq("quarter_id", quarterId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ marks: data });
}

// POST { rows: { student_id, rubric_id, quarter_id, scores, submitted }[] }
export async function POST(req: NextRequest) {
  const { rows } = await req.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows array is required" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("marks")
    .upsert(rows, { onConflict: "student_id,rubric_id,quarter_id" })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ marks: data });
}