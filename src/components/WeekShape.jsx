import { useState } from "react";
import { useIsMobile } from "../hooks/useMediaQuery.js";

export default function WeekShape({ weekShape, workstreams, readOnly, onUpdateDay, onAddDay, onRemoveDay, dailyLogs }) {
  const mobile = useIsMobile();
  const [editingIndex, setEditingIndex] = useState(null);
  const [editField, setEditField] = useState(null); // 'focus' | 'activities'
  const [editValue, setEditValue] = useState("");
  const [expandedLogs, setExpandedLogs] = useState({});

  const startEdit = (index, field, currentValue) => {
    setEditingIndex(index);
    setEditField(field);
    setEditValue(currentValue || "");
  };

  const commitEdit = () => {
    if (editingIndex != null && editField && onUpdateDay) {
      onUpdateDay(editingIndex, { [editField]: editValue });
    }
    setEditingIndex(null);
    setEditField(null);
    setEditValue("");
  };

  // Progress summary from workstreams
  const allTasks = workstreams ? workstreams.flatMap(w => w.tasks) : [];
  const total = allTasks.length;
  const done = allTasks.filter(t => t.status === "DONE").length;
  const inProg = allTasks.filter(t => t.status === "IN PROGRESS").length;
  const waiting = allTasks.filter(t => t.status === "WAITING").length;

  return (
    <div style={{ background: "#18181B", borderRadius: "10px", padding: "16px", marginBottom: "24px", border: "1px solid #2A2A2E" }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Week Shape</div>

      {/* Progress summary */}
      {workstreams && (
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px", padding: "10px 12px", background: "#1C1C1E", borderRadius: "8px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#6E6E73", textTransform: "uppercase", letterSpacing: "0.5px" }}>This Week</span>
          <div style={{ display: "flex", gap: "12px", alignItems: "baseline" }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "16px", fontWeight: 700, color: "#5B8DEF" }}>{done}</span>
            <span style={{ fontSize: "10px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace" }}>done</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "16px", fontWeight: 700, color: "#6CC4A1" }}>{inProg}</span>
            <span style={{ fontSize: "10px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace" }}>active</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "16px", fontWeight: 700, color: "#E8A838" }}>{waiting}</span>
            <span style={{ fontSize: "10px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace" }}>waiting</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: mobile ? "80px" : "100px", height: "6px", background: "#2A2A2E", borderRadius: "3px", overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${total > 0 ? (done/total)*100 : 0}%`, background: "#5B8DEF", transition: "width 0.3s" }} />
              <div style={{ width: `${total > 0 ? (inProg/total)*100 : 0}%`, background: "#6CC4A1", transition: "width 0.3s" }} />
              <div style={{ width: `${total > 0 ? (waiting/total)*100 : 0}%`, background: "#E8A838", transition: "width 0.3s" }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#6E6E73" }}>{total > 0 ? Math.round((done/total)*100) : 0}%</span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flexDirection: mobile ? "column" : "row" }}>
        {weekShape.map((day, i) => {
          const focusColor = day.focus === "DONE" ? "#5B8DEF" : day.focus === "PREP" ? "#E8A838" : day.focus === "EXECUTE" ? "#6CC4A1" : day.focus.includes("MEETING") ? "#E85B5B" : "#8E8E93";
          return (
            <div key={i} style={{ flex: mobile ? "none" : "1 1 180px", background: "#1C1C1E", borderRadius: "8px", padding: "10px 12px", borderTop: `2px solid ${focusColor}`, position: "relative" }}>
              {onRemoveDay && !readOnly && (
                <button onClick={() => onRemoveDay(i)} style={{
                  position: "absolute", top: "4px", right: "6px", background: "transparent",
                  border: "none", color: "#3A3A3E", cursor: "pointer", fontSize: "12px",
                  padding: "2px 4px", lineHeight: 1,
                }}>×</button>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", paddingRight: "16px" }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#E5E5EA", fontWeight: 600 }}>{day.day}</span>
                {!readOnly && editingIndex === i && editField === "focus" ? (
                  <input value={editValue} onChange={e => setEditValue(e.target.value)}
                    onBlur={commitEdit} onKeyDown={e => e.key === "Enter" && commitEdit()}
                    autoFocus
                    style={{ fontSize: "9px", color: focusColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.5px", background: "#0D0D0F", border: "1px solid #3A3A3E", borderRadius: "3px", padding: "1px 4px", width: "80px", textAlign: "right", outline: "none" }} />
                ) : (
                  <span onClick={() => !readOnly && startEdit(i, "focus", day.focus)} style={{ fontSize: "9px", color: focusColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.5px", cursor: readOnly ? "default" : "pointer" }}>{day.focus}</span>
                )}
              </div>
              <div style={{ height: "1px", background: "#2A2A2E", margin: "4px 0 6px" }} />
              {!readOnly && editingIndex === i && editField === "activities" ? (
                <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                  onBlur={commitEdit} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); } }}
                  autoFocus
                  style={{ width: "100%", fontSize: "11px", color: "#8E8E93", lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif", background: "#0D0D0F", border: "1px solid #3A3A3E", borderRadius: "4px", padding: "4px 6px", resize: "vertical", minHeight: "40px", boxSizing: "border-box", outline: "none" }} />
              ) : (
                <div onClick={() => !readOnly && startEdit(i, "activities", day.activities)} style={{ fontSize: "11px", color: "#8E8E93", lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif", cursor: readOnly ? "default" : "pointer", minHeight: "20px" }}>
                  {day.activities || (readOnly ? <span style={{ color: "#3A3A3E", fontStyle: "italic" }}>—</span> : <span style={{ color: "#3A3A3E", fontStyle: "italic" }}>click to add activities</span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {onAddDay && !readOnly && (
        <button onClick={onAddDay} style={{
          background: "transparent", border: "1px dashed #2A2A2E", borderRadius: "8px",
          padding: mobile ? "12px 14px" : "8px 14px", color: "#4A4A4E", fontSize: "12px", cursor: "pointer",
          width: "100%", textAlign: "left", fontFamily: "'DM Sans', sans-serif", marginTop: "8px",
          minHeight: mobile ? "44px" : "auto",
        }}>+ Add day</button>
      )}

      {/* Daily activity (richer than just a log preview — shows the day's
           priority queue with final statuses, plus the log narrative) */}
      {dailyLogs && (() => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(monday.getDate() + diff);
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(d.getDate() + i);
          weekDates.push(d.toISOString().slice(0, 10));
        }
        const weekEntries = weekDates
          .filter(date => dailyLogs[date])
          .map(date => ({ date, ...dailyLogs[date] }));

        if (weekEntries.length === 0) return null;

        // Resolve task ids → live task data (or fall back to snapshots)
        const allTasks = (workstreams || []).flatMap(ws => ws.tasks.map(t => ({ ...t, wsColor: ws.color })));
        const liveById = Object.fromEntries(allTasks.map(t => [t.id, t]));

        const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return (
          <div style={{ marginTop: "16px" }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73",
              marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px",
            }}>
              Daily Activity
            </div>
            {weekEntries.map(entry => {
              const d = new Date(entry.date + "T12:00:00");
              const label = `${dayLabels[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
              const isExpanded = expandedLogs[entry.date];
              const ids = entry.taskIds || [];
              const statuses = entry.taskStatusSnap || {};
              const titles = entry.taskTitleSnap || {};

              // Day-level outcome stats (from snapshot — falls back to live status)
              let dayDone = 0, dayActive = 0, dayWaiting = 0;
              for (const id of ids) {
                const s = statuses[id] || liveById[id]?.status || "NOT STARTED";
                if (s === "DONE") dayDone++;
                else if (s === "IN PROGRESS") dayActive++;
                else if (s === "WAITING") dayWaiting++;
              }

              return (
                <div key={entry.date} style={{
                  background: "#1C1C1E", borderRadius: "8px", marginBottom: "6px",
                  border: "1px solid #2A2A2E", overflow: "hidden",
                }}>
                  <div
                    onClick={() => setExpandedLogs(prev => ({ ...prev, [entry.date]: !prev[entry.date] }))}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 12px", cursor: "pointer", flexWrap: "wrap",
                    }}
                  >
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
                      color: "#6E6E73", transform: isExpanded ? "rotate(90deg)" : "none",
                      transition: "transform 0.15s", display: "inline-block",
                    }}>▶</span>
                    <span style={{
                      fontFamily: "'Space Mono', monospace", fontSize: "11px",
                      color: "#E5E5EA", fontWeight: 600, minWidth: "56px",
                    }}>{label}</span>
                    {entry.userNote && (
                      <span style={{
                        fontSize: "11px", color: "#E8A838", fontStyle: "italic",
                        fontFamily: "'DM Sans', sans-serif", flex: 1, minWidth: "120px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>"{entry.userNote}"</span>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      {dayDone > 0 && (
                        <span style={{ fontSize: "10px", color: "#5B8DEF", fontFamily: "'JetBrains Mono', monospace" }}>
                          ✓ {dayDone}
                        </span>
                      )}
                      {dayActive > 0 && (
                        <span style={{ fontSize: "10px", color: "#6CC4A1", fontFamily: "'JetBrains Mono', monospace" }}>
                          ◇ {dayActive}
                        </span>
                      )}
                      {dayWaiting > 0 && (
                        <span style={{ fontSize: "10px", color: "#E8A838", fontFamily: "'JetBrains Mono', monospace" }}>
                          ⏸ {dayWaiting}
                        </span>
                      )}
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#4A4A4E",
                      }}>{ids.length || 0} planned</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "0 14px 12px 32px" }}>
                      {/* Priority list with status icons */}
                      {ids.length > 0 && (
                        <div style={{ marginBottom: entry.log ? "10px" : 0 }}>
                          {ids.map((id, i) => {
                            const st = statuses[id] || liveById[id]?.status || "NOT STARTED";
                            const title = liveById[id]?.title || titles[id] || `(deleted task ${id})`;
                            const wsColor = liveById[id]?.wsColor || "#4A4A4E";
                            const icon = st === "DONE" ? "✓" : st === "IN PROGRESS" ? "◇" : st === "WAITING" ? "⏸" : "○";
                            const iconColor = st === "DONE" ? "#5B8DEF" : st === "IN PROGRESS" ? "#6CC4A1" : st === "WAITING" ? "#E8A838" : "#6E6E73";
                            return (
                              <div key={id} style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                padding: "3px 0", fontSize: "11px",
                              }}>
                                <span style={{
                                  fontFamily: "'JetBrains Mono', monospace", fontSize: "9px",
                                  color: "#3A3A3E", minWidth: "14px",
                                }}>{i + 1}</span>
                                <span style={{ color: iconColor, fontSize: "11px", minWidth: "12px" }}>{icon}</span>
                                <span style={{ width: "3px", height: "12px", background: wsColor, borderRadius: "1px" }} />
                                <span style={{
                                  fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
                                  color: "#8E8E93", fontWeight: 600, minWidth: "44px",
                                }}>{id}</span>
                                <span style={{
                                  fontSize: "11px",
                                  color: st === "DONE" ? "#6E6E73" : "#C5C5CA",
                                  textDecoration: st === "DONE" ? "line-through" : "none",
                                  fontFamily: "'DM Sans', sans-serif", flex: 1,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>{title}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Log narrative */}
                      {entry.log ? (
                        <div style={{
                          background: "#0D0D0F", borderRadius: "6px", padding: "8px 10px",
                          borderLeft: "2px solid #2A2A2E",
                        }}>
                          {entry.log.split("\n").map((line, i) => (
                            <p key={i} style={{
                              margin: i === 0 ? 0 : "4px 0 0 0", fontSize: "11px",
                              color: "#C5C5CA", lineHeight: 1.5,
                              fontFamily: "'DM Sans', sans-serif",
                            }}>{line || "\u00A0"}</p>
                          ))}
                        </div>
                      ) : ids.length === 0 ? (
                        <span style={{ fontSize: "11px", color: "#3A3A3E", fontStyle: "italic" }}>
                          No activity recorded
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
