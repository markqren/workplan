import { useState } from "react";
import TaskRow from "./TaskRow.jsx";
import { useIsMobile } from "../hooks/useMediaQuery.js";

export default function Workstream({ ws, onStatusChange, onEdit, onDelete, onAddTask, onToggleSubtask, onAddSubtask, onDeleteSubtask, emptyFilterMessage }) {
  const mobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("N");
  const [newTarget, setNewTarget] = useState("");
  const [hovered, setHovered] = useState(false);

  const total = ws.tasks.length;
  const done = ws.tasks.filter(t => t.status === "DONE").length;
  const inProg = ws.tasks.filter(t => t.status === "IN PROGRESS").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const nextNum = ws.tasks.length + 1;
    onAddTask(ws.id, { id: `${ws.prefix}-${nextNum}`, type: newType, title: newTitle, status: "NOT STARTED", target: newTarget || "TBD" });
    setNewTitle(""); setNewTarget(""); setAdding(false);
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", gap: "12px", cursor: "pointer",
          padding: mobile ? "12px" : "12px 16px",
          background: hovered ? "#1E1E21" : "#18181B",
          borderRadius: "10px",
          border: `1px solid ${ws.color}22`, marginBottom: collapsed ? 0 : "8px", transition: "all 0.15s ease",
        }}>
        <div style={{ width: "14px", height: "14px", borderRadius: "4px", background: ws.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "14px", fontWeight: 700, color: "#E5E5EA", letterSpacing: "0.5px" }}>{ws.name}</span>
          <span style={{ fontSize: "11px", color: "#6E6E73", background: "#2A2A2E", padding: "1px 6px", borderRadius: "4px", marginLeft: "8px", fontFamily: "'JetBrains Mono', monospace" }}>{ws.tasks.length}</span>
          {!mobile && <span style={{ fontSize: "11px", color: "#6E6E73", marginLeft: "10px", fontFamily: "'DM Sans', sans-serif" }}>{ws.description}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <div style={{ width: "60px", height: "4px", background: "#2A2A2E", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: ws.color, borderRadius: "2px", transition: "width 0.3s ease" }} />
            </div>
            <span style={{ fontSize: "10px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace", minWidth: "32px" }}>{done}/{total}</span>
          </div>
          {!mobile && inProg > 0 && <span style={{ fontSize: "10px", color: "#6CC4A1", fontFamily: "'JetBrains Mono', monospace" }}>{inProg} active</span>}
          <span style={{ color: "#6E6E73", fontSize: "12px", transition: "transform 0.2s", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
        </div>
      </div>
      {!collapsed && (
        <div style={{ paddingLeft: mobile ? "4px" : "8px" }}>
          {ws.tasks.length === 0 && emptyFilterMessage && (
            <div style={{ padding: "12px 16px", fontSize: "12px", color: "#4A4A4E", fontFamily: "'DM Sans', sans-serif", fontStyle: "italic" }}>
              {emptyFilterMessage}
            </div>
          )}
          {ws.tasks.map(task => (
            <TaskRow key={task.id} task={task} wsColor={ws.color} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} onToggleSubtask={onToggleSubtask} onAddSubtask={onAddSubtask} onDeleteSubtask={onDeleteSubtask} />
          ))}
          {adding ? (
            <div style={{ padding: "12px 16px", background: "#1C1C1E", borderRadius: "8px", border: "1px dashed #3A3A3E", marginTop: "4px" }}>
              <textarea value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task description..."
                style={{ width: "100%", background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #3A3A3E", borderRadius: "6px", padding: "8px", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", resize: "vertical", minHeight: "48px", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center", flexWrap: mobile ? "wrap" : "nowrap" }}>
                <select value={newType} onChange={e => setNewType(e.target.value)} style={{ background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #3A3A3E", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", minHeight: mobile ? "44px" : "auto" }}>
                  <option value="N">Narrative</option><option value="D">Data/SQL</option><option value="A">Advisory</option><option value="--">Misc</option>
                </select>
                <input value={newTarget} onChange={e => setNewTarget(e.target.value)} placeholder="Target"
                  style={{ background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #3A3A3E", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", width: "80px", fontFamily: "'JetBrains Mono', monospace", minHeight: mobile ? "44px" : "auto" }} />
                <div style={{ flex: 1 }} />
                <button onClick={handleAdd} style={{ background: ws.color, color: "#0D0D0F", border: "none", borderRadius: "4px", padding: mobile ? "8px 16px" : "4px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer", minHeight: mobile ? "44px" : "auto" }}>Add</button>
                <button onClick={() => setAdding(false)} style={{ background: "transparent", color: "#6E6E73", border: "1px solid #3A3A3E", borderRadius: "4px", padding: mobile ? "8px 16px" : "4px 12px", fontSize: "11px", cursor: "pointer", minHeight: mobile ? "44px" : "auto" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} style={{
              background: "transparent", border: "1px dashed #2A2A2E", borderRadius: "8px",
              padding: mobile ? "12px 14px" : "8px 14px", color: "#4A4A4E", fontSize: "12px", cursor: "pointer",
              width: "100%", textAlign: "left", fontFamily: "'DM Sans', sans-serif", marginTop: "4px",
              minHeight: mobile ? "44px" : "auto",
            }}>+ Add task</button>
          )}
        </div>
      )}
    </div>
  );
}
