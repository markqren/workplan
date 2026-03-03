export default function StatsBar({ workstreams }) {
  const all = workstreams.flatMap(w => w.tasks);
  const total = all.length;
  const done = all.filter(t => t.status === "DONE").length;
  const inProg = all.filter(t => t.status === "IN PROGRESS").length;
  const waiting = all.filter(t => t.status === "WAITING").length;
  const notStarted = all.filter(t => t.status === "NOT STARTED").length;

  return (
    <div style={{ display: "flex", gap: "20px", padding: "14px 20px", background: "#18181B", borderRadius: "10px", marginBottom: "24px", border: "1px solid #2A2A2E", flexWrap: "wrap" }}>
      {[
        { label: "Total", value: total, color: "#E5E5EA" },
        { label: "Done", value: done, color: "#5B8DEF" },
        { label: "Active", value: inProg, color: "#6CC4A1" },
        { label: "Waiting", value: waiting, color: "#E8A838" },
        { label: "Not Started", value: notStarted, color: "#8E8E93" },
      ].map(s => (
        <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "22px", fontWeight: 700, color: s.color }}>{s.value}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#6E6E73", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</span>
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <div style={{ width: "120px", height: "6px", background: "#2A2A2E", borderRadius: "3px", overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${total > 0 ? (done/total)*100 : 0}%`, background: "#5B8DEF", transition: "width 0.3s" }} />
          <div style={{ width: `${total > 0 ? (inProg/total)*100 : 0}%`, background: "#6CC4A1", transition: "width 0.3s" }} />
          <div style={{ width: `${total > 0 ? (waiting/total)*100 : 0}%`, background: "#E8A838", transition: "width 0.3s" }} />
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#6E6E73" }}>{total > 0 ? Math.round((done/total)*100) : 0}%</span>
      </div>
    </div>
  );
}
