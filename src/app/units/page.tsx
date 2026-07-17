"use client";
import { useState } from "react";

interface Criterion {
  name: string;
  max: number;
}

export default function UnitsPage() {
  const [subject, setSubject] = useState("ICT");
  const [grade, setGrade] = useState("Grade 6");
  const [unitName, setUnitName] = useState("");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [planText, setPlanText] = useState("");

  const [generating, setGenerating] = useState(false);
  const [criteria, setCriteria] = useState<Criterion[] | null>(null);
  const [overview, setOverview] = useState("");

  const [existingRubric, setExistingRubric] = useState<{ criteria: Criterion[]; overview: string } | null>(null);
    const [checkingLibrary, setCheckingLibrary] = useState(false);

  async function handleCreateUnit() {
    setCreating(true);
    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, grade, name: unitName }),
    });
    const data = await res.json();
    setUnitId(data.unit?.id ?? null);
    setCreating(false);
    await checkExistingRubric(); 
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !unitId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/units/${unitId}/plan`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setPlanText(data.planText ?? "");
    setUploading(false);
  }

async function handleGenerateRubric() {
  if (!unitId || !planText) return;
  setGenerating(true);
  try {
    const res = await fetch("/api/rubric/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, subject, grade, unitName, planText }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert("Rubric generation failed: " + (data.error ?? res.statusText));
      return;
    }
    setCriteria(data.rubric?.criteria ?? null);
    setOverview(data.overview ?? "");
  } catch (err) {
    alert("Rubric generation failed: " + (err as Error).message);
  } finally {
    setGenerating(false);
  }
}

async function checkExistingRubric() {
  setCheckingLibrary(true);
  try {
    const params = new URLSearchParams({ subject, grade, unitName });
    const res = await fetch(`/api/rubric/check?${params}`);
    const data = await res.json();
    if (data.found) {
      setExistingRubric({ criteria: data.criteria, overview: data.overview });
    }
  } finally {
    setCheckingLibrary(false);
  }
}

  return (
    <div>
      <h2>Step 1: create unit</h2>
      <label>Subject <input value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
      <br />
      <label>Grade <input value={grade} onChange={(e) => setGrade(e.target.value)} /></label>
      <br />
      <label>Unit name <input value={unitName} onChange={(e) => setUnitName(e.target.value)} /></label>
      <br />
      <button onClick={handleCreateUnit} disabled={creating || !unitName}>
        {creating ? "Creating…" : "Create unit"}
      </button>

      {unitId && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: "green" }}>Unit created — id: <code>{unitId}</code></p>

            {checkingLibrary && <p>Checking rubric library…</p>}

            {existingRubric && (
            <div style={{ marginTop: 12, padding: 8, border: "1px solid #4a90d9", background: "#eef5fc" }}>
                <p>Found an existing locked rubric for this unit name/subject/grade.</p>
                <button
                onClick={() => {
                    setCriteria(existingRubric.criteria);
                    setOverview(existingRubric.overview);
                    setExistingRubric(null);
                }}
                >
                Use existing rubric
                </button>
                <button onClick={() => setExistingRubric(null)} style={{ marginLeft: 8 }}>
                No, start fresh
                </button>
            </div>
            )}


          <label>
            Upload unit plan (.docx)
            <input type="file" accept=".docx" onChange={handleFileUpload} disabled={uploading} />
          </label>
          {uploading && <p>Extracting text…</p>}
          {planText && (
            <div style={{ marginTop: 8 }}>
              <strong>Extracted text (preview):</strong>
              <p style={{ maxHeight: 150, overflow: "auto", border: "1px solid #ccc", padding: 8 }}>
                {planText.slice(0, 500)}…
              </p>
            </div>
          )}
        </div>
      )}

      {planText && (
        <div style={{ marginTop: 16 }}>
          <button onClick={handleGenerateRubric} disabled={generating}>
            {generating ? "Generating…" : "Generate rubric"}
          </button>
        </div>
      )}

     {criteria && (
  <div style={{ marginTop: 24 }}>
    <h3>Draft rubric (edit as needed)</h3>
    {criteria.map((c, i) => (
      <div key={i} style={{ marginBottom: 4 }}>
        <input
          value={c.name}
          style={{ width: 300 }}
          onChange={(e) => {
            const next = [...criteria];
            next[i] = { ...next[i], name: e.target.value };
            setCriteria(next);
          }}
        />
        <input
          type="number"
          value={c.max}
          style={{ width: 60, marginLeft: 8 }}
          onChange={(e) => {
            const next = [...criteria];
            next[i] = { ...next[i], max: Number(e.target.value) };
            setCriteria(next);
          }}
        />
        <span> / max</span>
        <button
          style={{ marginLeft: 8 }}
          onClick={() => setCriteria(criteria.filter((_, idx) => idx !== i))}
        >
          Remove
        </button>
      </div>
    ))}
    <button onClick={() => setCriteria([...criteria, { name: "", max: 5 }])}>
      + Add criterion
    </button>

    <h4>Unit overview (edit as needed)</h4>
    <textarea
      rows={4}
      style={{ width: "100%" }}
      value={overview}
      onChange={(e) => setOverview(e.target.value)}
    />
  </div>
)}
    </div>
  );
}