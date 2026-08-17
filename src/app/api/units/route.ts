import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("units")
    .select("*, rubrics(id, criteria, locked), quarters(id, label)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ units: data });
}

export async function POST(req: NextRequest) {
  const { subject, grade, name, quarterId } = await req.json();

  if (!subject || !grade || !name || !quarterId) {
    return NextResponse.json(
      { error: "subject, grade, name, and quarterId are all required" },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("units")
    .insert({ subject, grade, name, quarter_id: quarterId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ unit: data });
}