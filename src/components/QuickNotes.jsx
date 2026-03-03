import { useState } from "react";

export default function QuickNotes({ notes, onAdd, onDelete }) {
  const [text, setText] = useState("");

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd({ text, ts: new Date().toISOString() });
    setText("");
  };

  return (
    <>
      <div style={{ display: "flex", gap: "8px", marginBottom: notes.length > 0 ? "10px" : 0 }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Jot something down..."
          style={{ flex: 1, background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #2A2A2E", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }} />
        <button onClick={handleAdd} style={{ background: "#2A2A2E", color: "#E5E5EA", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>+</button>
      </div>
      {notes.map((n, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", padding: "6px 0", borderBottom: i < notes.length - 1 ? "1px solid #1C1C1E" : "none" }}>
          <span style={{ fontSize: "10px", color: "#4A4A4E", fontFamily: "'JetBrains Mono', monospace", minWidth: "50px", paddingTop: "2px" }}>
            {new Date(n.ts).toLocaleDateString("en-US", { weekday: "short" })}
          </span>
          <span style={{ flex: 1, fontSize: "12px", color: "#C7C7CC", fontFamily: "'DM Sans', sans-serif" }}>{n.text}</span>
          <button onClick={() => onDelete(i)} style={{ background: "transparent", border: "none", color: "#3A3A3E", cursor: "pointer", fontSize: "12px", padding: "0 4px" }}>×</button>
        </div>
      ))}
    </>
  );
}
