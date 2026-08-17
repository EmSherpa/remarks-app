import { supabaseServer } from "@/lib/supabase";
import type { StudentQuarterRecord } from "@/lib/gemini";

export async function consolidateQuarterData(sectionId: string, quarterId: string) {
  const supabase = supabaseServer();

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, name")
    .eq("section_id", sectionId);

  if (studentsError) throw new Error(studentsError.message);
  if (!students || students.length === 0) throw new Error("No students found in this section");

  const studentIds = students.map((s) => s.id);

  const { data: marks, error: marksError } = await supabase
    .from("marks")
    .select("student_id, rubric_id, scores, submitted")
    .eq("quarter_id", quarterId)
    .in("student_id", studentIds);

  if (marksError) throw new Error(marksError.message);

  const rubricIds = [...new Set((marks ?? []).map((m) => m.rubric_id))];
  if (rubricIds.length === 0) throw new Error("No marks found for this section and quarter yet");

  // Ordered by created_at ascending — approximates the order units were
  // actually taught, so the quarter summary narrative reads chronologically.
  const { data: rubrics, error: rubricsError } = await supabase
    .from("rubrics")
    .select("id, criteria, locked, created_at, units(id, name, overview, subject, grade)")
    .in("id", rubricIds)
    .eq("locked", true)
    .order("created_at", { ascending: true });

  if (rubricsError) throw new Error(rubricsError.message);
  if (!rubrics || rubrics.length === 0) throw new Error("No locked rubrics found among this quarter's marks");

  const studentRecords: StudentQuarterRecord[] = students.map((student) => ({
    student_name: student.name,
    units: rubrics.map((rubric: any) => {
      const mark = marks!.find((m) => m.student_id === student.id && m.rubric_id === rubric.id);
      return {
        unit_name: rubric.units.name,
        criteria: rubric.criteria,
        scores: mark?.submitted ? mark.scores : null,
      };
    }),
  }));

  // Kept as a structured, ordered array — NOT pre-joined into one string.
  // Merging these into one flowing paragraph is a genuine writing task,
  // handled separately by generateQuarterSummary().
  const unitsUsed = rubrics.map((r: any) => ({
    id: r.units.id,
    name: r.units.name,
    overview: r.units.overview,
  }));

  const grade = (rubrics[0] as any)?.units.grade ?? "";
  const subject = (rubrics[0] as any)?.units.subject ?? "";

  return { students: studentRecords, unitsUsed, grade, subject };
}