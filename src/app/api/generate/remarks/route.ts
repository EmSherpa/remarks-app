import { NextRequest, NextResponse } from "next/server";
import { generateRemarks, generateQuarterSummary } from "@/lib/gemini";
import { consolidateQuarterData } from "@/lib/consolidate";
import { supabaseServer } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { sectionId, quarterId } = await req.json();

  if (!sectionId || !quarterId) {
    return NextResponse.json({ error: "sectionId and quarterId are required" }, { status: 400 });
  }

  const supabase = supabaseServer();

  let consolidateData;
  try {
    consolidateData = await consolidateQuarterData(sectionId, quarterId);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 404 });
  }

  const { students, unitsUsed, grade, subject } = consolidateData;

  const { data: quarterRow } = await supabase.from("quarters").select("label").eq("id", quarterId).single();
  const quarterLabel = quarterRow?.label ?? "this quarter";

  try {
    const quarterSummary = await generateQuarterSummary({
      grade,
      subject,
      quarterLabel,
      units: unitsUsed,
    });

    const remarks = await generateRemarks({
      grade,
      subject,
      quarterLabel,
      unitOverviews: quarterSummary,
      students,
    });

    for (const r of remarks) {
      const student = students.find((s: any) => s.student_name === r.student_name);
      if (!student) continue;

      const { data: studentRow } = await supabase
        .from("students")
        .select("id")
        .eq("name", r.student_name)
        .eq("section_id", sectionId)
        .single();
      if (!studentRow) continue;

      await supabase.from("remarks").upsert(
        {
          student_id: studentRow.id,
          quarter_id: quarterId,
          unit_summary: quarterSummary,
          remark: r.remark,
          approved: false,
        },
        { onConflict: "student_id,quarter_id" }
      );
    }

    return NextResponse.json({ remarks, quarterSummary });
  } catch (err) {
    console.error("Remarks generation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error generating remarks" },
      { status: 500 }
    );
  }
}