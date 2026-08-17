import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// POST { sectionId, quarterId, remarks: { student_name, remark }[] }
// Saves the teacher's (possibly edited) remark text and marks it approved.
export async function POST(req: NextRequest) {
  const { sectionId, quarterId, remarks } = await req.json();

  if (!sectionId || !quarterId || !Array.isArray(remarks)) {
    return NextResponse.json({ error: "sectionId, quarterId, and remarks array are required" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, name")
    .eq("section_id", sectionId);

  if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 });

  for (const r of remarks) {
    const student = students?.find((s) => s.name === r.student_name);
    if (!student) continue;

    const { error } = await supabase
      .from("remarks")
      .update({ remark: r.remark, approved: true })
      .eq("student_id", student.id)
      .eq("quarter_id", quarterId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}