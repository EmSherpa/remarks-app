"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import { StepProgress } from "@/components/StepProgress";

interface Section { id: string; name: string; grade: string; }
interface Student { id: string; name: string; }
interface Criterion { name: string; max: number; }
interface Unit {
  id: string;
  name: string;
  grade: string;
  rubrics: { id: string; criteria: Criterion[]; locked: boolean }[];
  quarters: { id: string; label: string } | null;
}
interface Quarter { id: string; label: string; }

interface RowState {
  scores: Record<string, number | "">;
  submitted: boolean;
}

export default function MarksPage() {
  const { showToast } = useToast();

  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [quarterId, setQuarterId] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [grid, setGrid] = useState<Record<string, RowState>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/sections").then((r) => r.json()).then((d) => setSections(d.sections ?? []));
    fetch("/api/units").then((r) => r.json()).then((d) => setUnits(d.units ?? []));
    fetch("/api/quarters").then((r) => r.json()).then((d) => setQuarters(d.quarters ?? []));
  }, []);

  const selectedSection = sections.find((s) => s.id === sectionId);

  // Unit choices are filtered by TWO things, not just "locked":
  // 1. grade must match the selected section's grade — this is the fix for
  //    Grade 6 units showing up while entering marks for a Grade 7 section.
  // 2. quarter must match the selected quarter, OR the unit predates the
  //    quarter-tagging feature (quarters === null) — kept visible rather
  //    than silently hidden, so older units aren't orphaned by this change.
  const availableUnits = units.filter(
    (u) =>
      u.rubrics.some((r) => r.locked) &&
      u.grade === selectedSection?.grade &&
      (!u.quarters || u.quarters.id === quarterId)
  );

  // Resetting the unit whenever section or quarter changes prevents a stale
  // selection from a previous grade/quarter silently carrying over.
  useEffect(() => {
    setUnitId("");
  }, [sectionId, quarterId]);

  const selectedUnit = units.find((u) => u.id === unitId);
  const lockedRubric = selectedUnit?.rubrics.find((r) => r.locked);
  const criteria = lockedRubric?.criteria ?? [];

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
    if (!text.includes("\t") && !text.includes("\n")) return;

    e.preventDefault();
    const rows = text.trim().split("\n").map((row) => row.split("\t"));

    setGrid((prev) => {
      const next = { ...prev };
      rows.forEach((rowValues, rowOffset) => {
        const student = students[startStudentIndex + rowOffset];
        if (!student) return;

        const updatedScores = { ...next[student.id].scores };
        rowValues.forEach((val, colOffset) => {
          const criterion = criteria[startCriterionIndex + colOffset];
          if (!criterion) return;
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
        showToast("Save failed: " + data.error, "error");
        return;
      }
      showToast("Marks saved.", "success");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <StepProgress current={2} />
      <h2>Enter marks</h2>

      <div className="field-row">
        <div className="field">
          <label>1. Section</label>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">— choose —</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.grade} — {s.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>2. Quarter</label>
          <select value={quarterId} onChange={(e) => setQuarterId(e.target.value)} disabled={!sectionId}>
            <option value="">— choose —</option>
            {quarters.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label>3. Unit</label>
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!sectionId || !quarterId}>
            <option value="">— choose —</option>
            {availableUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {sectionId && quarterId && availableUnits.length === 0 && (
        <div className="empty-state">
          No locked units found for {selectedSection?.grade}, this quarter. Create and lock one on the Units page first.
        </div>
      )}

      {students.length > 0 && criteria.length > 0 && (
        <>
        <div className="table-scroll">
          <table style={{ marginTop: 16 }}>
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
                        style={{ width: 60 }}
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
          </div>
          <button style={{ marginTop: 12 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save marks"}
          </button>
        </>
      )}
    </div>
  );
}