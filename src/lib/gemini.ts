import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Criterion } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Gemini 2.0 Flash was retired March 3, 2026 — do not use it.
// Flash-Lite currently has the highest free-tier daily request quota.
// Re-check ai.google.dev/gemini-api/docs/models and your project's live
// limits in AI Studio before relying on this long-term — Google revises
// free-tier limits and model availability without much notice.
const MODEL = "gemini-3.1-flash-lite-preview";

function parseJson<T>(text: string): T {
  // responseMimeType below should give clean JSON already; strip fences
  // defensively in case a future model version wraps it anyway.
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// Retries on 429s with exponential backoff + jitter. Only helps with
// RPM/TPM limits (transient) — a genuine RPD (daily) limit will still fail
// every retry, since it doesn't reset until midnight Pacific.
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const status = err?.status ?? err?.response?.status;
      if (status !== 429) throw err;
      const delay = 2 ** attempt * 1000 + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/**
 * Turns an uploaded unit plan into a draft rubric + curriculum overview.
 * The teacher reviews/edits the result before it's locked.
 */
export async function generateRubric(params: {
  subject: string;
  grade: string;
  unitName: string;
  planText: string;
}): Promise<{ criteria: Criterion[]; overview: string }> {
  const { subject, grade, unitName, planText } = params;

  const prompt = `You are helping a ${grade} ${subject} teacher turn a unit plan into an assessment rubric.

Unit name: ${unitName}

Unit plan content:
"""
${planText}
"""

Do two things:
1. Draft 3-5 assessment criteria specific to what this unit plan actually teaches (not generic
   categories like "participation" unless the plan calls for it). Each criterion needs a short
   name and a max score (use 4, 5, or 8 — pick whichever fits the plan's apparent grading scale,
   or 5 by default).
2. Write a 2-3 sentence overview of what this unit covers, in the voice of a curriculum summary,
   suitable for merging into a quarterly report card summary later.

Respond with ONLY this JSON shape:
{"criteria": [{"name": "...", "max": 5}], "overview": "..."}`;

  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await withRetry(() => model.generateContent(prompt));
  return parseJson(result.response.text());
}

export async function generateQuarterSummary(params: {
  grade: string;
  subject: string;
  quarterLabel: string;
  units: { name: string; overview: string }[];
}): Promise<string> {
  const { grade, subject, quarterLabel, units } = params;

  const prompt = `Act as a ${grade} ${subject} teacher writing the ${quarterLabel} curriculum
summary for a report card.

Here is each unit covered this quarter, in the order they were taught:
${units.map((u, i) => `${i + 1}. ${u.name}: ${u.overview}`).join("\n")}

Write ONE short paragraph (4-6 sentences) merging these into a single coherent narrative of the
quarter's learning journey — not a list of units, a flowing story with natural transitions
("began by...", "then transitioned into...", "the quarter culminated in..."). Match the actual
teaching order given above.

Respond with ONLY the paragraph text, no JSON, no quotation marks, no preamble.`;

  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await withRetry(() => model.generateContent(prompt));
  return result.response.text().trim();
}

export interface StudentQuarterRecord {
  student_name: string;
  units: {
    unit_name: string;
    criteria: { name: string; max: number }[];
    scores: Record<string, number> | null;
  }[];
}

export interface GeneratedRemark {
  student_name: string;
  remark: string;
}

/**
 * Batched remark generation for a whole class at once — not one call per
 * student. Doing it per-student loses the "read back through prior remarks
 * to avoid repeating vocabulary" quality we relied on doing this by hand
 * earlier in this project. For very large classes (30+), you'd eventually
 * want to chunk into groups and feed earlier chunks' output back in as
 * "already used, don't repeat" context — not needed yet at your class sizes.
 */
const MIN_WORDS = 90;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function generateRemarks(params: {
  grade: string;
  subject: string;
  quarterLabel: string;
  unitOverviews: string;
  students: StudentQuarterRecord[];
}): Promise<GeneratedRemark[]> {
  const { grade, subject, quarterLabel, unitOverviews, students } = params;

  const prompt = `Act as a ${grade} ${subject} teacher writing ${quarterLabel} report card remarks.

Quarter summary (already finalized, do not rewrite):
"""
${unitOverviews}
"""

Student data (scores per unit, per criterion; null scores object means no submission):
${JSON.stringify(students, null, 2)}

For each student, write ONE consolidated remark for the whole quarter using the
Strength-Weakness-Action (SWA) structure:
1. Strength (about 2 sentences) — grounded in their actual highest-relative scores. Name the
   specific skills or topics from the criteria, not generic praise.
2. Weakness (1-2 sentences) — one clear area tied to their lowest-relative score(s). Say what
   this looks like in practice and why it matters for the next unit.
3. Action (about 2 sentences) — a concrete, subject-specific next step: a specific practice
   activity, habit, or task the student can do, not a vague hope.

LENGTH IS A HARD REQUIREMENT: every remark must be between 90 and 120 words. Never write fewer
than 90 words. Count carefully before moving on to the next student.

Write in flowing prose. Vary vocabulary and sentence openings across students — read back through
your own earlier remarks in this same response before writing the next one. For students with no
submission in any unit, skip the SWA structure and the word minimum, and write a short neutral
note instead. Use warm, professional, age-appropriate language. Never mention raw scores.

Respond with ONLY this JSON array:
[{"student_name": "...", "remark": "..."}]`;

  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await withRetry(() => model.generateContent(prompt));
  const remarks: GeneratedRemark[] = parseJson(result.response.text());

  // Students with no submission in any unit get a deliberately short note,
  // so they're exempt from the word minimum.
  const noSubmission = new Set(
    students.filter((s) => s.units.every((u) => u.scores === null)).map((s) => s.student_name)
  );

  const tooShort = remarks.filter(
    (r) => !noSubmission.has(r.student_name) && wordCount(r.remark) < MIN_WORDS
  );
  if (tooShort.length === 0) return remarks;

  // One expansion pass for just the short ones. If a remark is still short
  // after this, we keep it rather than looping — the teacher can edit it in
  // the review table.
  const shortNames = new Set(tooShort.map((r) => r.student_name));
  const retryPrompt = `These ${grade} ${subject} report card remarks are too short. Rewrite each one
to be 95-120 words. Keep the same Strength → Weakness → Action structure and the same core points,
but add specific detail: name concrete skills or topics from the unit criteria, describe what the
weakness looks like in practice, and make the action step concrete. Do not invent claims the
data doesn't support. Do not mention raw scores.

Student data:
${JSON.stringify(students.filter((s) => shortNames.has(s.student_name)), null, 2)}

Current remarks:
${JSON.stringify(tooShort, null, 2)}

Respond with ONLY this JSON array:
[{"student_name": "...", "remark": "..."}]`;

  const retryResult = await withRetry(() => model.generateContent(retryPrompt));
  const expanded: GeneratedRemark[] = parseJson(retryResult.response.text());
  const expandedByName = new Map(expanded.map((r) => [r.student_name, r.remark]));

  return remarks.map((r) => ({
    ...r,
    remark: expandedByName.get(r.student_name) ?? r.remark,
  }));
}