"use client";
import { useState, useEffect } from "react";

interface Quarter {
  id: string;
  label: string;
}

export default function QuartersPage() {
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadQuarters() {
    const res = await fetch("/api/quarters");
    const data = await res.json();
    setQuarters(data.quarters ?? []);
  }

  useEffect(() => {
    loadQuarters();
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/quarters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Failed to create quarter: " + data.error);
        return;
      }
      setLabel("");
      await loadQuarters();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h2>Quarters</h2>

      <label>
        Label (e.g. Quarter 1 2083)
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>
      <br />
      <button onClick={handleCreate} disabled={creating || !label.trim()}>
        {creating ? "Creating…" : "Add quarter"}
      </button>

      <h3 style={{ marginTop: 24 }}>Existing quarters</h3>
      <ul>
        {quarters.map((q) => (
          <li key={q.id}>{q.label}</li>
        ))}
      </ul>
    </div>
  );
}