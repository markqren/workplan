import { useState } from "react";
import { STATUS_CONFIG, TYPE_LABELS, TYPE_ICONS, STATUSES } from "../lib/constants.js";
import { useIsMobile } from "../hooks/useMediaQuery.js";

function StatusBadge({ status, onClick, mobile }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG["NOT STARTED"];
  return (
    <button onClick={onClick} style={{
      background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
      padding: mobile ? "6px 12px" : "3px 10px", borderRadius: "4px", fontSize: "10px",
      fontWeight: 600, letterSpacing: "0.5px", cursor: "pointer",
      textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace",
      transition: "all 0.15s ease", minHeight: mobile ? "44px" : "auto",
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

function SubtaskCheckbox({ checked, onChange }) {
  return (
    <button onClick={onChange} style={{
      width: "14px", height: "14px", borderRadius: "3px", border: `1px solid ${checked ? "#6CC4A1" : "#4A4A4E"}`,
      background: checked ? "#6CC4A1" : "transparent", cursor: "pointer", padding: 0, flexShrink: 0,
      display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease",
    }}>
      {checked && <span style={{ color: "#0D0D0F", fontSize: "10px", lineHeight: 1 }}>✓</span>}
    </button>
  );
}

export default function TaskRow({ task, wsColor, readOnly, onStatusChange, onEdit, onDelete, onToggleSubtask, onAddSubtask, onDeleteSubtask }) {
  const mobile = useIsMobile();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editTarget, setEditTarget] = useState(task.target);
  const [editSubtasks, setEditSubtasks] = useState(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editDocuments, setEditDocuments] = useState(task.documents || []);
  const [newDocLabel, setNewDocLabel] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");
  const [hoveredSubtask, setHoveredSubtask] = useState(null);
  const [showOldCompleted, setShowOldCompleted] = useState(false);

  const subtasks = task.subtasks || [];
  const doneCount = subtasks.filter(s => s.done).length;

  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const isOldCompleted = (s) => s.done && s.completedAt && (Date.now() - new Date(s.completedAt).getTime()) >= SEVEN_DAYS;
  const visibleSubtasks = subtasks.filter(s => !isOldCompleted(s));
  const collapsedSubtasks = subtasks.filter(s => isOldCompleted(s));

  const cycleStatus = () => {
    if (readOnly) return;
    const idx = STATUSES.indexOf(task.status);
    onStatusChange(task.id, STATUSES[(idx + 1) % STATUSES.length]);
  };

  const startEditing = () => {
    setEditTitle(task.title);
    setEditTarget(task.target);
    setEditSubtasks((task.subtasks || []).map(s => ({ ...s })));
    setNewSubtaskTitle("");
    setEditDocuments((task.documents || []).map(d => ({ ...d })));
    setNewDocLabel("");
    setNewDocUrl("");
    setEditing(true);
  };

  const handleSave = () => {
    onEdit(task.id, { title: editTitle, target: editTarget, subtasks: editSubtasks, documents: editDocuments });
    setEditing(false);
  };

  const handleEditSubtaskTitle = (idx, title) => {
    setEditSubtasks(prev => prev.map((s, i) => i === idx ? { ...s, title } : s));
  };

  const handleDeleteEditSubtask = (idx) => {
    setEditSubtasks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddEditSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const suffix = String.fromCharCode(97 + editSubtasks.length);
    setEditSubtasks(prev => [...prev, { id: `${task.id}${suffix}`, title: newSubtaskTitle.trim(), done: false }]);
    setNewSubtaskTitle("");
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
        </div>

        {/* Sub-tasks section */}
        <div style={{ marginTop: "12px" }}>
          <span style={{ fontSize: "11px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sub-tasks</span>
          <div style={{ marginTop: "6px" }}>
            {editSubtasks.map((s, i) => (
              <div key={s.id || i} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                <input value={s.title} onChange={e => handleEditSubtaskTitle(i, e.target.value)}
                  style={{ flex: 1, background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #3A3A3E", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }} />
                <button onClick={() => handleDeleteEditSubtask(i)} style={{ background: "transparent", border: "none", color: "#4A2020", cursor: "pointer", fontSize: "14px", padding: "2px 4px", minWidth: mobile ? "44px" : "auto", minHeight: mobile ? "44px" : "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
              <input value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddEditSubtask()}
                placeholder="＋ add sub-task"
                style={{ flex: 1, background: "#0D0D0F", color: "#E5E5EA", border: "1px dashed #3A3A3E", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }} />
              <button onClick={handleAddEditSubtask} style={{ background: "transparent", border: "1px solid #3A3A3E", color: "#6E6E73", borderRadius: "4px", padding: "2px 8px", fontSize: "11px", cursor: "pointer" }}>+</button>
            </div>
          </div>
        </div>

        {/* Documents section */}
        <div style={{ marginTop: "12px" }}>
          <span style={{ fontSize: "11px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.5px" }}>Documents</span>
          <div style={{ marginTop: "6px" }}>
            {editDocuments.map((doc, i) => (
              <div key={doc.id || i} style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "4px" }}>
                <input value={doc.label} onChange={e => setEditDocuments(prev => prev.map((d, j) => j === i ? { ...d, label: e.target.value } : d))}
                  placeholder="Label"
                  style={{ width: "140px", background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #3A3A3E", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }} />
                <input value={doc.url} onChange={e => setEditDocuments(prev => prev.map((d, j) => j === i ? { ...d, url: e.target.value } : d))}
                  placeholder="URL"
                  style={{ flex: 1, background: "#0D0D0F", color: "#5B8DEF", border: "1px solid #3A3A3E", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }} />
                <button onClick={() => setEditDocuments(prev => prev.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", color: "#4A2020", cursor: "pointer", fontSize: "14px", padding: "2px 4px" }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
              <input value={newDocLabel} onChange={e => setNewDocLabel(e.target.value)}
                placeholder="Label"
                style={{ width: "140px", background: "#0D0D0F", color: "#E5E5EA", border: "1px dashed #3A3A3E", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }} />
              <input value={newDocUrl} onChange={e => setNewDocUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newDocLabel.trim() && newDocUrl.trim()) {
                    const id = `doc-${Date.now()}`;
                    setEditDocuments(prev => [...prev, { id, label: newDocLabel.trim(), url: newDocUrl.trim(), subtask_ids: [] }]);
                    setNewDocLabel(""); setNewDocUrl("");
                  }
                }}
                placeholder="＋ add document URL"
                style={{ flex: 1, background: "#0D0D0F", color: "#E5E5EA", border: "1px dashed #3A3A3E", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }} />
              <button onClick={() => {
                if (!newDocLabel.trim() || !newDocUrl.trim()) return;
                const id = `doc-${Date.now()}`;
                setEditDocuments(prev => [...prev, { id, label: newDocLabel.trim(), url: newDocUrl.trim(), subtask_ids: [] }]);
                setNewDocLabel(""); setNewDocUrl("");
              }} style={{ background: "transparent", border: "1px solid #3A3A3E", color: "#6E6E73", borderRadius: "4px", padding: "2px 8px", fontSize: "11px", cursor: "pointer" }}>+</button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center" }}>
          <div style={{ flex: 1 }} />
          <button onClick={handleSave} style={{ background: "#6CC4A1", color: "#0D0D0F", border: "none", borderRadius: "4px", padding: mobile ? "8px 16px" : "4px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer", minHeight: mobile ? "44px" : "auto" }}>Save</button>
          <button onClick={() => setEditing(false)} style={{ background: "transparent", color: "#6E6E73", border: "1px solid #3A3A3E", borderRadius: "4px", padding: mobile ? "8px 16px" : "4px 12px", fontSize: "11px", cursor: "pointer", minHeight: mobile ? "44px" : "auto" }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: mobile ? "stretch" : "flex-start", flexDirection: mobile ? "column" : "row",
      flexWrap: mobile ? "nowrap" : "wrap",
      gap: mobile ? "8px" : "12px", padding: mobile ? "10px 12px" : "10px 14px",
      background: task.status === "DONE" ? "#111114" : "#1C1C1E",
      borderRadius: "8px", marginBottom: "6px", transition: "all 0.15s ease",
      opacity: task.status === "DONE" ? 0.55 : 1,
      borderLeft: `3px solid ${wsColor || STATUS_CONFIG[task.status]?.fg || "#3A3A3E"}`,
    }}>
      {mobile ? (
        <>
          {/* Mobile: top row with ID, type, target, status, actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#8E8E93", fontWeight: 600 }}>{task.id}</span>
            <TypeTag type={task.type} />
            <span style={{ fontSize: "11px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace" }}>→ {task.target}</span>
            {subtasks.length > 0 && (
              <span style={{ fontSize: "10px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace" }}>{doneCount}/{subtasks.length}</span>
            )}
            <div style={{ flex: 1 }} />
            <StatusBadge status={task.status} onClick={cycleStatus} mobile={mobile} />
          </div>
          {/* Title */}
          <div style={{ fontSize: "13px", color: task.status === "DONE" ? "#6E6E73" : "#E5E5EA", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", textDecoration: task.status === "DONE" ? "line-through" : "none" }}>
            {task.title}
          </div>
          {/* Actions row */}
          {!readOnly && (
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={startEditing} title="Edit" style={{ background: "transparent", border: "1px solid #2A2A2E", color: "#6E6E73", cursor: "pointer", fontSize: "14px", padding: "8px 12px", borderRadius: "4px", minHeight: "44px" }}>✎</button>
              <button onClick={() => onDelete(task.id)} title="Delete" style={{ background: "transparent", border: "1px solid #2A2A2E", color: "#4A2020", cursor: "pointer", fontSize: "14px", padding: "8px 12px", borderRadius: "4px", minHeight: "44px" }}>×</button>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ minWidth: "64px" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#8E8E93", fontWeight: 600 }}>{task.id}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <TypeTag type={task.type} />
              <span style={{ fontSize: "11px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace" }}>→ {task.target}</span>
              {subtasks.length > 0 && (
                <span style={{ fontSize: "10px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace" }}>
                  {doneCount}/{subtasks.length}
                </span>
              )}
            </div>
            <div style={{ fontSize: "13px", color: task.status === "DONE" ? "#6E6E73" : "#E5E5EA", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", textDecoration: task.status === "DONE" ? "line-through" : "none" }}>
              {task.title}
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
            <StatusBadge status={task.status} onClick={cycleStatus} mobile={false} />
            {!readOnly && (
              <>
                <button onClick={startEditing} title="Edit" style={{ background: "transparent", border: "none", color: "#6E6E73", cursor: "pointer", fontSize: "14px", padding: "2px 4px" }}>✎</button>
                <button onClick={() => onDelete(task.id)} title="Delete" style={{ background: "transparent", border: "none", color: "#4A2020", cursor: "pointer", fontSize: "14px", padding: "2px 4px" }}>×</button>
              </>
            )}
          </div>
        </>
      )}
      {/* Sub-tasks + Related Documents — full width below the main row */}
      {(subtasks.length > 0 || (task.documents && task.documents.length > 0)) && (
        <div style={{ width: "100%", paddingLeft: mobile ? "8px" : "20px" }}>
          {subtasks.length > 0 && (
            <div>
              {visibleSubtasks.map(s => (
                <div key={s.id}
                  onMouseEnter={() => setHoveredSubtask(s.id)}
                  onMouseLeave={() => setHoveredSubtask(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px", padding: "2px 0",
                  }}>
                  {(() => {
                    const linkedDoc = (task.documents || []).find(d => (d.subtask_ids || []).includes(s.id));
                    return linkedDoc ? (
                      <a href={linkedDoc.url} target="_blank" rel="noopener noreferrer" title={linkedDoc.label}
                        style={{ fontSize: "11px", textDecoration: "none", opacity: 0.7, flexShrink: 0 }}
                        onClick={e => e.stopPropagation()}>📄</a>
                    ) : null;
                  })()}
                  <SubtaskCheckbox checked={s.done} onChange={() => onToggleSubtask(task.id, s.id)} />
                  <span style={{
                    fontSize: "11px", fontFamily: "'JetBrains Mono', monospace",
                    color: s.done ? "#6E6E73" : "#C5C5CA",
                    textDecoration: s.done ? "line-through" : "none",
                    opacity: s.done ? 0.6 : 1,
                    flex: 1,
                  }}>{s.title}</span>
                  {hoveredSubtask === s.id && (
                    <button onClick={() => onDeleteSubtask(task.id, s.id)} style={{
                      background: "transparent", border: "none", color: "#4A2020", cursor: "pointer",
                      fontSize: "12px", padding: "0 2px", lineHeight: 1,
                    }}>×</button>
                  )}
                </div>
              ))}
              {collapsedSubtasks.length > 0 && (
                <>
                  <div
                    onClick={() => setShowOldCompleted(v => !v)}
                    onMouseEnter={e => e.currentTarget.style.color = "#6E6E73"}
                    onMouseLeave={e => e.currentTarget.style.color = "#4A4A4E"}
                    style={{
                      fontSize: "9px", color: "#4A4A4E", fontFamily: "'JetBrains Mono', monospace",
                      cursor: "pointer", padding: "2px 0",
                    }}
                  >
                    {showOldCompleted ? "▾" : "▸"} {collapsedSubtasks.length} older completed
                  </div>
                  {showOldCompleted && collapsedSubtasks.map(s => (
                    <div key={s.id}
                      onMouseEnter={() => setHoveredSubtask(s.id)}
                      onMouseLeave={() => setHoveredSubtask(null)}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px", padding: "2px 0",
                      }}>
                      {(() => {
                        const linkedDoc = (task.documents || []).find(d => (d.subtask_ids || []).includes(s.id));
                        return linkedDoc ? (
                          <a href={linkedDoc.url} target="_blank" rel="noopener noreferrer" title={linkedDoc.label}
                            style={{ fontSize: "11px", textDecoration: "none", opacity: 0.7, flexShrink: 0 }}
                            onClick={e => e.stopPropagation()}>📄</a>
                        ) : null;
                      })()}
                      <SubtaskCheckbox checked={s.done} onChange={() => onToggleSubtask(task.id, s.id)} />
                      <span style={{
                        fontSize: "11px", fontFamily: "'JetBrains Mono', monospace",
                        color: "#6E6E73", textDecoration: "line-through", opacity: 0.6, flex: 1,
                      }}>{s.title}</span>
                      {hoveredSubtask === s.id && (
                        <button onClick={() => onDeleteSubtask(task.id, s.id)} style={{
                          background: "transparent", border: "none", color: "#4A2020", cursor: "pointer",
                          fontSize: "12px", padding: "0 2px", lineHeight: 1,
                        }}>×</button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
          {task.documents && task.documents.length > 0 && (
            <div style={{ marginTop: subtasks.length > 0 ? "6px" : 0 }}>
              <span style={{ fontSize: "9px", color: "#4A4A4E", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.5px" }}>📎 related docs</span>
              {task.documents.map(doc => (
                <div key={doc.id} style={{ padding: "2px 0" }}>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "#5B8DEF", textDecoration: "none" }}
                    onMouseEnter={e => e.target.style.textDecoration = "underline"}
                    onMouseLeave={e => e.target.style.textDecoration = "none"}
                  >{doc.label} <span style={{ fontSize: "9px", opacity: 0.6 }}>↗</span></a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
