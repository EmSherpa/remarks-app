"use client";
import { useState, useEffect } from "react";
import { StepProgress } from "@/components/StepProgress";

interface Section { id: string; name: string; grade: string; }
interface Quarter { id: string; label: string; }

export default function GeneratePage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [quarterId, setQuarterId] = useState("");
  const [consolidating, setConsolidating] = useState(false);
  const [consolidated, setConsolidated] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [remarks, setRemarks] = useState<{ student_name: string; remark: string }[]>([]);
  const [quarterSummary, setQuarterSummary] = useState("");
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    fetch("/api/sections").then((r) => r.json()).then((d) => setSections(d.sections ?? []));
    fetch("/api/quarters").then((r) => r.json()).then((d) => setQuarters(d.quarters ?? []));
  }, []);

  async function handleCheckData() {
    setConsolidating(true);
    setConsolidated(null);
    try {
      const res = await fetch(`/api/generate/consolidate?sectionId=${sectionId}&quarterId=${quarterId}`);
      const data = await res.json();
      if (!res.ok) {
        alert("Couldn't consolidate: " + data.error);
        return;
      }
      setConsolidated(data);
    } catch (err) {
      alert("Check data failed: " + (err as Error).message);
    } finally {
      setConsolidating(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate/remarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, quarterId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Generation failed: " + data.error);
        return;
      }
      setRemarks(data.remarks);
      setQuarterSummary(data.quarterSummary ?? "");
    } catch (err) {
      alert("Generation failed: " + (err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleApproveAll() {
    setApproving(true);
    try {
      const res = await fetch("/api/generate/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, quarterId, remarks }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Approve failed: " + data.error);
        return;
      }
      setApproved(true);
    } finally {
      setApproving(false);
    }
  }

  async function handleExport() {
    const res = await fetch("/api/generate/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, quarterId }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "remarks.docx";
    a.click();
  }

  return (
    <div>
      <h2>Generate remarks</h2>

      <label>
        Section
        <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          <option value="">— choose —</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.grade} — {s.name}</option>)}
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

      {sectionId && quarterId && (
        <div style={{ marginTop: 16 }}>
          <button onClick={handleCheckData} disabled={consolidating}>
            {consolidating ? "Checking…" : "Check data"}
          </button>

          {consolidated && (
            <div style={{ marginTop: 12 }}>
              <p><strong>Units found:</strong> {consolidated.unitsUsed.map((u: any) => u.name).join(", ")}</p>
              <p><strong>Students:</strong> {consolidated.students.length}</p>
              <button onClick={handleGenerate} disabled={generating}>
                {generating ? "Generating…" : "Generate remarks"}
              </button>
            </div>
          )}
        </div>
      )}

      {quarterSummary && (
        <div style={{ margin: "16px 0", padding: 12, background: "#f0f4f8", borderRadius: 8 }}>
          <strong>Quarter summary:</strong>
          <p style={{ marginTop: 4 }}>{quarterSummary}</p>
        </div>
      )}

      {remarks.length > 0 && (
        <>
          <table border={1} cellPadding={6} style={{ marginTop: 16, width: "100%" }}>
            <thead>
              <tr><th>Student</th><th>Remark (editable)</th></tr>
            </thead>
            <tbody>
              {remarks.map((r, i) => (
                <tr key={r.student_name}>
                  <td style={{ verticalAlign: "top", fontWeight: "bold" }}>{r.student_name}</td>
                  <td>
                    <textarea
                      rows={4}
                      style={{ width: "100%" }}
                      value={r.remark}
                      onChange={(e) => {
                        const next = [...remarks];
                        next[i] = { ...next[i], remark: e.target.value };
                        setRemarks(next);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="btn-row" style={{ marginTop: 12 }}>
            <button onClick={handleApproveAll} disabled={approving}>
              {approving ? "Approving…" : "Approve all"}
            </button>
            {approved && <span style={{ color: "green", marginLeft: 12 }}>✓ Approved</span>}
            {approved && (
              <button onClick={handleExport} style={{ marginLeft: 12 }}>
                Export to Word
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}