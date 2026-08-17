"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import { StepProgress } from "@/components/StepProgress";

interface Criterion { name: string; max: number; }
interface Section { id: string; name: string; grade: string; }
interface Quarter { id: string; label: string; }
interface ExistingUnit {
  id: string;
  name: string;
  subject: string;
  grade: string;
  rubrics: { locked: boolean }[];
  quarters: { label: string } | null;
}

export default function UnitsPage() {
  const { showToast } = useToast();

  const [sections, setSections] = useState<Section[]>([]);
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [existingUnits, setExistingUnits] = useState<ExistingUnit[]>([]);

  const [subject, setSubject] = useState("ICT");
  const [grade, setGrade] = useState("");
  const [quarterId, setQuarterId] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [planText, setPlanText] = useState("");

  const [generating, setGenerating] = useState(false);
  const [criteria, setCriteria] = useState<Criterion[] | null>(null);
  const [overview, setOverview] = useState("");
  const [rubricId, setRubricId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const [existingRubric, setExistingRubric] = useState<{ criteria: Criterion[]; overview: string } | null>(null);
  const [checkingLibrary, setCheckingLibrary] = useState(false);

  const grades = [...new Set(sections.map((s) => s.grade))];

  async function loadEverything() {
    const [sectionsRes, quartersRes, unitsRes] = await Promise.all([
      fetch("/api/sections").then((r) => r.json()),
      fetch("/api/quarters").then((r) => r.json()),
      fetch("/api/units").then((r) => r.json()),
    ]);
    setSections(sectionsRes.sections ?? []);
    setQuarters(quartersRes.quarters ?? []);
    setExistingUnits(unitsRes.units ?? []);
  }

  useEffect(() => {
    loadEverything();
  }, []);

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

  async function handleCreateUnit() {
    setCreating(true);
    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, grade, name: unitName, quarterId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("Couldn't create unit: " + data.error, "error");
        return;
      }
      setUnitId(data.unit.id);
      await checkExistingRubric();
      await loadEverything();
    } finally {
      setCreating(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !unitId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/units/${unitId}/plan`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        showToast("Upload failed: " + data.error, "error");
        return;
      }
      setPlanText(data.planText ?? "");
    } finally {
      setUploading(false);
    }
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
        showToast("Rubric generation failed: " + data.error, "error");
        return;
      }
      setCriteria(data.rubric?.criteria ?? null);
      setRubricId(data.rubric?.id ?? null);
      setOverview(data.overview ?? "");
    } catch (err) {
      showToast("Rubric generation failed: " + (err as Error).message, "error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleLockRubric() {
    if (!rubricId || !unitId || !criteria) return;
    const res = await fetch(`/api/rubric/${rubricId}/lock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteria, overview, unitId }),
    });
    if (res.ok) {
      setLocked(true);
      showToast("Rubric locked.", "success");
      await loadEverything();
    } else {
      const data = await res.json();
      showToast("Locking failed: " + data.error, "error");
    }
  }

  return (
    <div>
      <StepProgress current={1} />
      <h2>Units &amp; rubrics</h2>

      {sections.length === 0 ? (
        <div className="empty-state">
          No sections yet — <a href="/sections">add one first</a>, since grade options come from there.
        </div>
      ) : (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Create unit</h3>
          <div className="field-row">
            <div className="field">
              <label>Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="field">
              <label>Grade</label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="">— choose —</option>
                {grades.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Quarter</label>
              <select value={quarterId} onChange={(e) => setQuarterId(e.target.value)}>
                <option value="">— choose —</option>
                {quarters.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Unit name</label>
            <input value={unitName} onChange={(e) => setUnitName(e.target.value)} />
          </div>
          <button
            onClick={handleCreateUnit}
            disabled={creating || !unitName || !grade || !quarterId}
          >
            {creating ? "Creating…" : "Create unit"}
          </button>

          {unitId && (
            <div style={{ marginTop: 16 }}>
              <span className="badge badge-success">Unit created</span>

              {checkingLibrary && <p style={{ marginTop: 8 }}>Checking rubric library…</p>}
              {existingRubric && (
                <div className="card-muted" style={{ marginTop: 12 }}>
                  <p style={{ marginTop: 0 }}>Found an existing locked rubric for this unit name/subject/grade.</p>
                  <button
                    onClick={() => {
                      setCriteria(existingRubric.criteria);
                      setOverview(existingRubric.overview);
                      setExistingRubric(null);
                    }}
                  >
                    Use existing rubric
                  </button>
                  <button className="secondary" onClick={() => setExistingRubric(null)} style={{ marginLeft: 8 }}>
                    No, start fresh
                  </button>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <label>Upload unit plan (.docx)</label>
                <input type="file" accept=".docx" onChange={handleFileUpload} disabled={uploading} />
                {uploading && <p>Extracting text…</p>}
              </div>

              {planText && (
                <button style={{ marginTop: 16 }} onClick={handleGenerateRubric} disabled={generating}>
                  {generating ? "Generating…" : "Generate rubric"}
                </button>
              )}

              {criteria && (
                <div style={{ marginTop: 24 }}>
                  <h4>Draft rubric</h4>
                  {criteria.map((c, i) => (
                    <div key={i} style={{ marginBottom: 4, display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={c.name}
                        style={{ flex: "1 1 160px", minWidth: 0 }}
                        onChange={(e) => {
                          const next = [...criteria];
                          next[i] = { ...next[i], name: e.target.value };
                          setCriteria(next);
                        }}
                      />
                      <input
                        type="number"
                        value={c.max}
                        style={{ width: 60 }}
                        onChange={(e) => {
                          const next = [...criteria];
                          next[i] = { ...next[i], max: Number(e.target.value) };
                          setCriteria(next);
                        }}
                      />
                      <button className="secondary" onClick={() => setCriteria(criteria.filter((_, idx) => idx !== i))}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button className="secondary" onClick={() => setCriteria([...criteria, { name: "", max: 5 }])}>
                    + Add criterion
                  </button>

                  <h4 style={{ marginTop: 20 }}>Unit overview</h4>
                  <textarea rows={4} value={overview} onChange={(e) => setOverview(e.target.value)} />

                  {!locked ? (
                    <button style={{ marginTop: 12 }} onClick={handleLockRubric}>Lock rubric</button>
                  ) : (
                    <p style={{ marginTop: 12 }}><span className="badge badge-success">✓ Locked</span></p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <h3>Existing units</h3>
      {existingUnits.length === 0 ? (
        <div className="empty-state">No units created yet.</div>
      ) : (
        <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Name</th><th>Subject</th><th>Grade</th><th>Quarter</th><th>Status</th></tr>
          </thead>
          <tbody>
            {existingUnits.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.subject}</td>
                <td>{u.grade}</td>
                <td>{u.quarters?.label ?? "—"}</td>
                <td>
                  {u.rubrics.some((r) => r.locked) ? (
                    <span className="badge badge-success">Locked</span>
                  ) : (
                    <span className="badge badge-accent">Draft</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}