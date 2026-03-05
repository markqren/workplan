import { useState } from "react";
import { useIsMobile } from "../hooks/useMediaQuery.js";

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function QuickNotes({ notes, onAdd, onDelete }) {
  const mobile = useIsMobile();
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
          style={{ flex: 1, background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #2A2A2E", borderRadius: "6px", padding: mobile ? "12px" : "8px 12px", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", minHeight: mobile ? "44px" : "auto" }} />
        <button onClick={handleAdd} style={{ background: "#2A2A2E", color: "#E5E5EA", border: "none", borderRadius: "6px", padding: mobile ? "12px 16px" : "8px 14px", fontSize: "12px", cursor: "pointer", fontWeight: 600, minHeight: mobile ? "44px" : "auto" }}>+</button>
      </div>
      {notes.length === 0 && (
        <div style={{ padding: "12px 0", fontSize: "12px", color: "#3A3A3E", fontFamily: "'DM Sans', sans-serif", fontStyle: "italic" }}>
          No notes yet — jot something down
        </div>
      )}
      {notes.map((n, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", padding: "6px 0", borderBottom: i < notes.length - 1 ? "1px solid #1C1C1E" : "none" }}>
          <span style={{ fontSize: "10px", color: "#4A4A4E", fontFamily: "'JetBrains Mono', monospace", minWidth: "56px", paddingTop: "2px" }}>
            {timeAgo(n.ts)}
          </span>
          <span style={{ flex: 1, fontSize: "12px", color: "#C7C7CC", fontFamily: "'DM Sans', sans-serif" }}>{n.text}</span>
          <button onClick={() => onDelete(i)} style={{ background: "transparent", border: "none", color: "#3A3A3E", cursor: "pointer", fontSize: "12px", padding: mobile ? "4px 8px" : "0 4px", minWidth: mobile ? "44px" : "auto", minHeight: mobile ? "44px" : "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      ))}
    </>
  );
}
