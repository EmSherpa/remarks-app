import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Criterion } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Gemini 2.0 Flash was retired March 3, 2026 — do not use it.
// Flash-Lite currently has the highest free-tier daily request quota.
// Re-check ai.google.dev/gemini-api/docs/models and your project's live
// limits in AI Studio before relying on this long-term — Google revises
// free-tier limits and model availability without much notice.
const MODEL = "gemini-2.5-flash-lite";

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