import { NextRequest, NextResponse } from "next/server";
import { generateRubric } from "@/lib/gemini";
import { supabaseServer } from "@/lib/supabase";

// POST { unitId, subject, grade, unitName, planText }
// Generates a draft rubric + overview and saves it as an unlocked (editable)
// rubric row. The teacher edits it client-side, then a separate step
// (Step 1.9, coming up) finalizes it by setting locked = true.
export async function POST(req: NextRequest) {
  const { unitId, subject, grade, unitName, planText } = await req.json();

  if (!unitId || !planText) {
    return NextResponse.json({ error: "unitId and planText are required" }, { status: 400 });
  }

  try {
    const { criteria, overview } = await generateRubric({ subject, grade, unitName, planText });

    const supabase = supabaseServer();

    await supabase.from("units").update({ overview }).eq("id", unitId);

    const { data, error } = await supabase
      .from("rubrics")
      .insert({ unit_id: unitId, criteria, locked: false, version: 1 })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ rubric: data, overview });
  } catch (err) {
    // Catches Gemini API failures (quota, invalid key, malformed JSON response,
    // etc.) and returns a proper JSON error instead of letting it crash into
    // an HTML error page the client can't parse.
    console.error("Rubric generation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error generating rubric" },
      { status: 500 }
    );
  }
}