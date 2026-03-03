import { signOut } from '../lib/auth.js';

export default function Header({ data, view, setView, filter, setFilter, onReset }) {
  return (
    <div style={{ padding: "24px 32px 16px", borderBottom: "1px solid #1C1C1E", position: "sticky", top: 0, background: "#0D0D0F", zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "12px" }}>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: "20px", fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>⬡ WORKPLAN</h1>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#6E6E73" }}>{data.weekLabel}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#3A3A3E" }}>
          saved {new Date(data.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={onReset} style={{ background: "transparent", border: "none", color: "#3A3A3E", fontSize: "10px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>reset</button>
        <button onClick={() => signOut()} style={{ background: "transparent", border: "none", color: "#3A3A3E", fontSize: "10px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>sign out</button>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        {[{ id: "tasks", label: "Tasks" }, { id: "week", label: "Week" }, { id: "context", label: "Context" }].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            background: view === v.id ? "#2A2A2E" : "transparent", color: view === v.id ? "#E5E5EA" : "#6E6E73",
            border: "1px solid", borderColor: view === v.id ? "#3A3A3E" : "transparent",
            borderRadius: "6px", padding: "5px 14px", fontSize: "12px", cursor: "pointer",
            fontFamily: "'Space Mono', monospace", fontWeight: 600,
          }}>{v.label}</button>
        ))}
        <div style={{ width: "1px", background: "#2A2A2E", margin: "0 4px" }} />
        {view !== "context" && ["all", "active", "done"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: "transparent", color: filter === f ? "#E5E5EA" : "#4A4A4E",
            border: "none", fontSize: "11px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
            textTransform: "uppercase", letterSpacing: "0.5px",
            borderBottom: filter === f ? "1px solid #6E6E73" : "1px solid transparent", padding: "5px 8px",
          }}>{f}</button>
        ))}
      </div>
    </div>
  );
}
