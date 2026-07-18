"use client";
import { useState, useEffect } from "react";

interface Section { id: string; name: string; grade: string; }
interface Student { id: string; name: string; }
interface Criterion { name: string; max: number; }
interface Unit { id: string; name: string; rubrics: { id: string; criteria: Criterion[]; locked: boolean }[]; }
interface Quarter { id: string; label: string; }

interface RowState {
  scores: Record<string, number | "">;
  submitted: boolean;
}

export default function MarksPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [quarterId, setQuarterId] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [grid, setGrid] = useState<Record<string, RowState>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/sections").then((r) => r.json()).then((d) => setSections(d.sections ?? []));
    fetch("/api/units").then((r) => r.json()).then((d) => setUnits(d.units ?? []));
    fetch("/api/quarters").then((r) => r.json()).then((d) => setQuarters(d.quarters ?? []));
  }, []);

  const selectedUnit = units.find((u) => u.id === unitId);
  const lockedRubric = selectedUnit?.rubrics.find((r) => r.locked);
  const criteria = lockedRubric?.criteria ?? [];

  // Load students + any existing marks whenever all three pickers are set.
  useEffect(() => {
    if (!sectionId || !lockedRubric || !quarterId) return;

    (async () => {
      const studentsRes = await fetch(`/api/students?sectionId=${sectionId}`);
      const studentsData = await studentsRes.json();
      const loadedStudents: Student[] = studentsData.students ?? [];
      setStudents(loadedStudents);

      const marksRes = await fetch(`/api/marks?rubricId=${lockedRubric.id}&quarterId=${quarterId}`);
      const marksData = await marksRes.json();
      const existingByStudent: Record<string, any> = {};
      for (const m of marksData.marks ?? []) existingByStudent[m.student_id] = m;

      const initialGrid: Record<string, RowState> = {};
      for (const s of loadedStudents) {
        const existing = existingByStudent[s.id];
        initialGrid[s.id] = {
          scores: existing?.scores ?? Object.fromEntries(criteria.map((c) => [c.name, ""])),
          submitted: existing ? existing.submitted : true,
        };
      }
      setGrid(initialGrid);
    })();
  }, [sectionId, unitId, quarterId]);

  function updateScore(studentId: string, criterionName: string, value: string) {
    setGrid((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        scores: { ...prev[studentId].scores, [criterionName]: value === "" ? "" : Number(value) },
      },
    }));
  }

  function toggleSubmitted(studentId: string) {
    setGrid((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], submitted: !prev[studentId].submitted },
    }));
  }
function handlePaste(e: React.ClipboardEvent, startStudentIndex: number, startCriterionIndex: number) {
  const text = e.clipboardData.getData("text");
  // Only intervene if this actually looks like a multi-cell paste (tabs or
  // newlines present) — otherwise let the browser handle a normal single-value
  // paste as usual.
  if (!text.includes("\t") && !text.includes("\n")) return;

  e.preventDefault();
  const rows = text.trim().split("\n").map((row) => row.split("\t"));

  setGrid((prev) => {
    const next = { ...prev };
    rows.forEach((rowValues, rowOffset) => {
      const student = students[startStudentIndex + rowOffset];
      if (!student) return; // pasted more rows than remaining students — stop safely

      const updatedScores = { ...next[student.id].scores };
      rowValues.forEach((val, colOffset) => {
        const criterion = criteria[startCriterionIndex + colOffset];
        if (!criterion) return; // pasted more columns than remaining criteria
        const num = Number(val.trim());
        if (!isNaN(num)) updatedScores[criterion.name] = num;
      });

      next[student.id] = { ...next[student.id], scores: updatedScores };
    });
    return next;
  });
}
  async function handleSave() {
    if (!lockedRubric || !quarterId) return;
    setSaving(true);
    try {
      const rows = students.map((s) => {
        const row = grid[s.id];
        return {
          student_id: s.id,
          rubric_id: lockedRubric.id,
          quarter_id: quarterId,
          scores: row.submitted ? row.scores : null,
          submitted: row.submitted,
        };
      });

      const res = await fetch("/api/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Save failed: " + data.error);
        return;
      }
      alert("Saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>Enter marks</h2>

      <label>
        Section
        <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          <option value="">— choose —</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.grade} — {s.name}</option>)}
        </select>
      </label>
      {" "}
      <label>
        Unit (locked rubrics only)
        <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          <option value="">— choose —</option>
          {units.filter((u) => u.rubrics.some((r) => r.locked)).map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </label>
      {" "}
      <label>
        Quarter
        <select value={quarterId} onChange={(e) => setQuarterId(e.target.value)}>
          <option value="">— choose —</option>
          {quarters.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
        </select>
      </label>

      {students.length > 0 && criteria.length > 0 && (
        <>
          <table border={1} cellPadding={4} style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Student</th>
                {criteria.map((c) => <th key={c.name}>{c.name} (/{c.max})</th>)}
                <th>No submission</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  {criteria.map((c, ci) => (
                    <td key={c.name}>
                      <input
                        type="number"
                        style={{ width: 50 }}
                        disabled={!grid[s.id]?.submitted}
                        value={grid[s.id]?.scores[c.name] ?? ""}
                        onChange={(e) => updateScore(s.id, c.name, e.target.value)}
                        onPaste={(e) => handlePaste(e, students.indexOf(s), ci)}
                      />
                    </td>
                  ))}
                  <td>
                    <input
                      type="checkbox"
                      checked={!grid[s.id]?.submitted}
                      onChange={() => toggleSubmitted(s.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button style={{ marginTop: 12 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save marks"}
          </button>
        </>
      )}
    </div>
  );
}