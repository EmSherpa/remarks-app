import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// GET → list all sections
// POST { name, grade } → creates a section
export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sections: data });
}

export async function POST(req: NextRequest) {
  const { name, grade } = await req.json();

  if (!name || !grade) {
    return NextResponse.json({ error: "name and grade are required" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("sections")
    .insert({ name, grade })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ section: data });
}