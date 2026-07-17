"use client";
import { useState } from "react";

export default function UnitsPage() {
  const [subject, setSubject] = useState("ICT");
  const [grade, setGrade] = useState("Grade 6");
  const [unitName, setUnitName] = useState("");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
        <p style={{ color: "green" }}>
          Unit created — id: <code>{unitId}</code>
        </p>
      )}
    </div>
  );
}