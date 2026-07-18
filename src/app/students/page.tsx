"use client";
import { useState, useEffect } from "react";

interface Section {
  id: string;
  name: string;
  grade: string;
}

interface Student {
  id: string;
  name: string;
}

export default function StudentsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [rosterText, setRosterText] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/sections")
      .then((res) => res.json())
      .then((data) => setSections(data.sections ?? []));
  }, []);

  async function loadStudents(id: string) {
    if (!id) {
      setStudents([]);
      return;
    }
    const res = await fetch(`/api/students?sectionId=${id}`);
    const data = await res.json();
    setStudents(data.students ?? []);
  }

  useEffect(() => {
    loadStudents(sectionId);
  }, [sectionId]);

  async function handleAddRoster() {
    const names = rosterText.split("\n").map((n) => n.trim()).filter((n) => n.length > 0);
    if (!sectionId || names.length === 0) return;

    setAdding(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, names }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Failed to add students: " + data.error);
        return;
      }
      setRosterText("");
      await loadStudents(sectionId);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <h2>Students</h2>

      <label>
        Section
        <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          <option value="">— choose a section —</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.grade} — {s.name}
            </option>
          ))}
        </select>
      </label>

      {sectionId && (
        <div style={{ marginTop: 16 }}>
          <label>
            Paste roster (one name per line)
            <textarea
              rows={8}
              style={{ width: "100%" }}
              value={rosterText}
              onChange={(e) => setRosterText(e.target.value)}
              placeholder={"Aammanya Shrestha\nAarju Nepal\nAarushi Dahal\n..."}
            />
          </label>
          <br />
          <button onClick={handleAddRoster} disabled={adding || !rosterText.trim()}>
            {adding ? "Adding…" : "Add students"}
          </button>

          <h3 style={{ marginTop: 24 }}>Current roster ({students.length})</h3>
          <ul>
            {students.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}