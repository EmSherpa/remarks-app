import { NextRequest } from "next/server";
import { buildRemarksDocx } from "@/lib/docxBuilder";
import { supabaseServer } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { sectionId, quarterId } = await req.json();
  const supabase = supabaseServer();

  const { data: section } = await supabase.from("sections").select("*").eq("id", sectionId).single();
  const { data: quarter } = await supabase.from("quarters").select("*").eq("id", quarterId).single();
  const { data: students } = await supabase.from("students").select("id, name").eq("section_id", sectionId);

  const { data: remarksRows } = await supabase
    .from("remarks")
    .select("*")
    .in("student_id", (students ?? []).map((s) => s.id))
    .eq("quarter_id", quarterId)
    .eq("approved", true);

  const remarks = (remarksRows ?? []).map((r) => {
    const student = students!.find((s) => s.id === r.student_id)!;
    return { student_name: student.name, remark: r.remark };
  });

  const quarterSummary = remarksRows?.[0]?.unit_summary ?? "";

  const buffer = await buildRemarksDocx({
    title: `${section?.grade} (${section?.name}) – ${quarter?.label} Remarks`,
    subtitle: "",
    quarterSummary,
    remarks,
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${section?.grade}_${section?.name}_${quarter?.label}_Remarks.docx"`,
    },
  });
}