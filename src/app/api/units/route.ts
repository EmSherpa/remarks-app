import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// POST { subject, grade, name } → creates a unit row, returns it.
export async function POST(req: NextRequest) {
  const { subject, grade, name } = await req.json();

  if (!subject || !grade || !name) {
    return NextResponse.json(
      { error: "subject, grade, and name are all required" },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("units")
    .insert({ subject, grade, name })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ unit: data });
}