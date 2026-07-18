import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// PATCH { criteria, overview, unitId }
// Saves the teacher's final edits and locks the rubric — no further
// edits allowed after this, since marks entry (Phase 2) will depend on
// the criteria staying exactly as they were when marks were recorded.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { criteria, overview, unitId } = await req.json();

  const supabase = supabaseServer();

  const { error: rubricError } = await supabase
    .from("rubrics")
    .update({ criteria, locked: true })
    .eq("id", id);

  if (rubricError) return NextResponse.json({ error: rubricError.message }, { status: 500 });

  const { error: unitError } = await supabase
    .from("units")
    .update({ overview })
    .eq("id", unitId);

  if (unitError) return NextResponse.json({ error: unitError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}