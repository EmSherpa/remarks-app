const STEPS = ["Setup", "Units & Rubrics", "Enter Marks", "Generate & Export"];

export function StepProgress({ current }: { current: number }) {
  return (
    <div className="step-progress">
      {STEPS.map((label, i) => (
        <div key={label} className={`step ${i === current ? "current" : i < current ? "done" : ""}`}>
          {i < current ? "✓ " : `${i + 1}. `}{label}
        </div>
      ))}
    </div>
  );
}