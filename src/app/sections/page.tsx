"use client";
import { useState, useEffect } from "react";

interface Section {
  id: string;
  name: string;
  grade: string;
}

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("Grade 6");
  const [creating, setCreating] = useState(false);

  async function loadSections() {
    const res = await fetch("/api/sections");
    const data = await res.json();
    setSections(data.sections ?? []);
  }

  useEffect(() => {
    loadSections();
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, grade }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Failed to create section: " + data.error);
        return;
      }
      setName("");
      await loadSections();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h2>Sections</h2>

      <div style={{ marginBottom: 24 }}>
        <label>Name (e.g. Barun) <input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <br />
        <label>Grade <input value={grade} onChange={(e) => setGrade(e.target.value)} /></label>
        <br />
        <button onClick={handleCreate} disabled={creating || !name}>
          {creating ? "Creating…" : "Add section"}
        </button>
      </div>

      <h3>Existing sections</h3>
      <ul>
        {sections.map((s) => (
          <li key={s.id}>
            {s.grade} — {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}