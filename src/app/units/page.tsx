"use client";
import { useState } from "react";

export default function UnitsPage() {
  const [subject, setSubject] = useState("ICT");
  const [grade, setGrade] = useState("Grade 6");
  const [unitName, setUnitName] = useState("");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [planText, setPlanText] = useState("");

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
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !unitId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/units/${unitId}/plan`, {
      method: "POST",
      body: formData, // no Content-Type header — the browser sets the
                       // correct multipart boundary automatically
    });
    const data = await res.json();
    setPlanText(data.planText ?? "");
    setUploading(false);
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
    </div>
  );
}