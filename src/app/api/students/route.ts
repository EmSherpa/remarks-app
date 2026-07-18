import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// GET ?sectionId=... → list students in a section
// POST { sectionId, names: string[] } → bulk-inserts students
export async function GET(req: NextRequest) {
  const sectionId = req.nextUrl.searchParams.get("sectionId");
  if (!sectionId) {
    return NextResponse.json({ error: "sectionId is required" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("section_id", sectionId)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ students: data });
}

export async function POST(req: NextRequest) {
  const { sectionId, names } = await req.json();

  if (!sectionId || !Array.isArray(names) || names.length === 0) {
    return NextResponse.json({ error: "sectionId and a non-empty names array are required" }, { status: 400 });
  }

  // Defensive cleanup even though the client should already do this —
  // never trust that the client-side filtering actually ran.
  const cleanNames = names.map((n: string) => n.trim()).filter((n: string) => n.length > 0);

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("students")
    .insert(cleanNames.map((name: string) => ({ section_id: sectionId, name })))
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ students: data });
}