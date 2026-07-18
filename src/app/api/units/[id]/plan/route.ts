import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { supabaseServer } from "@/lib/supabase";

// Section headings that, once reached, contribute nothing useful to rubric
// generation — usually because they duplicate an earlier table with added
// scheduling detail (specific calendar dates) rather than new pedagogical
// content. Add to this list if your school's unit-plan template has other
// trailing sections like this (e.g. a blank "Reflection" section, sign-off
// fields, etc.) — check with a real file before assuming a new template
// needs the same cuts, since this is specific to IWS's current format.
const CUT_AFTER_HEADINGS = ["Daily Lessons Sequences"];

function cleanPlanText(raw: string): string {
  let text = raw;

  for (const heading of CUT_AFTER_HEADINGS) {
    const idx = text.indexOf(heading);
    if (idx !== -1) text = text.slice(0, idx);
  }

  // Collapse whitespace noise — empty template placeholder lines/cells
  // routinely extract as long runs of spaces or blank lines.
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { value: rawText } = await mammoth.extractRawText({ buffer });
  const planText = cleanPlanText(rawText);

  const supabase = supabaseServer();
  const { error } = await supabase
    .from("units")
    .update({ plan_text: planText })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ planText });
}