const TYPE_LABELS = { N: "Narrative", D: "Data/SQL", A: "Advisory", "--": "Misc" };

export function generateWeeklySummary(data) {
  const allTasks = data.workstreams.flatMap(ws => ws.tasks.map(t => ({ ...t, wsName: ws.name })));
  const done = allTasks.filter(t => t.status === "DONE");
  const inProg = allTasks.filter(t => t.status === "IN PROGRESS");
  const waiting = allTasks.filter(t => t.status === "WAITING");
  const notStarted = allTasks.filter(t => t.status === "NOT STARTED");

  const lines = [];

  // Header
  lines.push(`# ${data.weekLabel}`);
  lines.push(`*Exported ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}*`);
  lines.push("");

  // Progress
  lines.push("## Progress");
  lines.push(`- **${done.length}/${allTasks.length}** tasks completed`);
  if (inProg.length > 0) lines.push(`- **${inProg.length}** in progress`);
  if (waiting.length > 0) lines.push(`- **${waiting.length}** waiting`);
  if (notStarted.length > 0) lines.push(`- **${notStarted.length}** not started`);
  lines.push("");

  // Task sections grouped by workstream
  const renderTaskGroup = (title, tasks) => {
    if (tasks.length === 0) return;
    lines.push(`## ${title}`);
    const byWs = {};
    for (const t of tasks) {
      if (!byWs[t.wsName]) byWs[t.wsName] = [];
      byWs[t.wsName].push(t);
    }
    for (const [wsName, wsTasks] of Object.entries(byWs)) {
      lines.push(`### ${wsName}`);
      for (const t of wsTasks) {
        const type = TYPE_LABELS[t.type] || t.type;
        lines.push(`- **${t.id}** [${type}] ${t.title}`);
        if (t.subtasks && t.subtasks.length > 0) {
          for (const s of t.subtasks) {
            lines.push(`  - [${s.done ? "x" : " "}] ${s.title}`);
          }
        }
      }
    }
    lines.push("");
  };

  renderTaskGroup("Completed", done);
  renderTaskGroup("In Progress", inProg);
  renderTaskGroup("Waiting", waiting);
  renderTaskGroup("Not Started", notStarted);

  // Week Shape
  if (data.weekShape && data.weekShape.length > 0) {
    lines.push("## Week Shape");
    for (const day of data.weekShape) {
      lines.push(`- **${day.day}** — ${day.focus}${day.activities ? `: ${day.activities}` : ""}`);
    }
    lines.push("");
  }

  // Notes
  if (data.notes && data.notes.length > 0) {
    lines.push("## Notes");
    for (const n of data.notes) {
      const date = new Date(n.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      lines.push(`- [${date}] ${n.text}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
