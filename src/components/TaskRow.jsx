import { useState } from "react";
import { STATUS_CONFIG, TYPE_LABELS, TYPE_ICONS, STATUSES } from "../lib/constants.js";

function StatusBadge({ status, onClick }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG["NOT STARTED"];
  return (
    <button onClick={onClick} style={{
      background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
      padding: "3px 10px", borderRadius: "4px", fontSize: "10px",
      fontWeight: 600, letterSpacing: "0.5px", cursor: "pointer",
      textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace",
      transition: "all 0.15s ease",
    }}>{status}</button>
  );
}

function TypeTag({ type }) {
  return (
    <span style={{
      fontSize: "10px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace",
      marginRight: "8px", display: "inline-flex", alignItems: "center", gap: "3px",
    }}>
      <span style={{ fontSize: "12px" }}>{TYPE_ICONS[type] || "○"}</span>
      {TYPE_LABELS[type] || type}
    </span>
  );
}

export default function TaskRow({ task, onStatusChange, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editTarget, setEditTarget] = useState(task.target);

  const cycleStatus = () => {
    const idx = STATUSES.indexOf(task.status);
    onStatusChange(task.id, STATUSES[(idx + 1) % STATUSES.length]);
  };

  const handleSave = () => {
    onEdit(task.id, { title: editTitle, target: editTarget });
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ padding: "12px 16px", background: "#1C1C1E", borderRadius: "8px", border: "1px solid #3A3A3E", marginBottom: "6px" }}>
        <textarea value={editTitle} onChange={e => setEditTitle(e.target.value)}
          style={{ width: "100%", background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #3A3A3E", borderRadius: "6px", padding: "8px", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", resize: "vertical", minHeight: "60px", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#6E6E73" }}>Target:</span>
          <input value={editTarget} onChange={e => setEditTarget(e.target.value)}
            style={{ background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #3A3A3E", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", width: "100px" }} />
          <div style={{ flex: 1 }} />
          <button onClick={handleSave} style={{ background: "#6CC4A1", color: "#0D0D0F", border: "none", borderRadius: "4px", padding: "4px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Save</button>
          <button onClick={() => setEditing(false)} style={{ background: "transparent", color: "#6E6E73", border: "1px solid #3A3A3E", borderRadius: "4px", padding: "4px 12px", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px",
      background: task.status === "DONE" ? "#111114" : "#1C1C1E",
      borderRadius: "8px", marginBottom: "4px", transition: "all 0.15s ease",
      opacity: task.status === "DONE" ? 0.55 : 1,
      borderLeft: `3px solid ${STATUS_CONFIG[task.status]?.fg || "#3A3A3E"}`,
    }}>
      <div style={{ minWidth: "64px" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#8E8E93", fontWeight: 600 }}>{task.id}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: "4px" }}>
          <TypeTag type={task.type} />
          <span style={{ fontSize: "11px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace" }}>→ {task.target}</span>
        </div>
        <div style={{ fontSize: "13px", color: task.status === "DONE" ? "#6E6E73" : "#E5E5EA", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", textDecoration: task.status === "DONE" ? "line-through" : "none" }}>
          {task.title}
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
        <StatusBadge status={task.status} onClick={cycleStatus} />
        <button onClick={() => setEditing(true)} title="Edit" style={{ background: "transparent", border: "none", color: "#6E6E73", cursor: "pointer", fontSize: "14px", padding: "2px 4px" }}>✎</button>
        <button onClick={() => onDelete(task.id)} title="Delete" style={{ background: "transparent", border: "none", color: "#4A2020", cursor: "pointer", fontSize: "14px", padding: "2px 4px" }}>×</button>
      </div>
    </div>
  );
}
