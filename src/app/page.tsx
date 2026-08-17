export default function Home() {
  return (
    <div>
      <h2>Remarks Generator</h2>
      <p>Automates quarterly report card remarks from unit plans and marks.</p>

      <ol style={{ lineHeight: 2 }}>
        <li><a href="/sections">Set up a section</a> and add students</li>
        <li><a href="/units">Create a unit</a>, upload its plan, generate and lock a rubric</li>
        <li><a href="/marks">Enter marks</a> against a locked rubric</li>
        <li>Repeat for every unit in the quarter</li>
        <li><a href="/generate">Generate, review, approve, and export</a> remarks once all units are done</li>
      </ol>
    </div>
  );
}