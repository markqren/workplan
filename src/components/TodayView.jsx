import { useState, useRef, useEffect } from "react";
import { STATUS_CONFIG, STATUSES } from "../lib/constants.js";
import { useIsMobile } from "../hooks/useMediaQuery.js";
import TaskRow from "./TaskRow.jsx";

export default function TodayView({
  data,
  todayPlan,
  onUpdateTodayPlan,
  onAddToToday,
  onRemoveFromToday,
  onReorderToday,
  onStatusChange,
  onEdit,
  onDelete,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onTriageSubmit,
}) {
  const mobile = useIsMobile();
  const [triageInput, setTriageInput] = useState("");
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageResponse, setTriageResponse] = useState(null);
  const [editingNote, setEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState(todayPlan.userNote || "");
  const [showPicker, setShowPicker] = useState(false);
  const [editingLog, setEditingLog] = useState(false);
  const [logInput, setLogInput] = useState(todayPlan.log || "");
  const [logSummarizing, setLogSummarizing] = useState(false);
  const inputRef = useRef(null);

  // Sync log input when todayPlan.log changes externally (e.g., agent writes it)
  useEffect(() => {
    if (!editingLog) setLogInput(todayPlan.log || "");
  }, [todayPlan.log]);

  // Resolve taskIds to actual task objects, preserving order
  const allTasks = data.workstreams.flatMap(ws => ws.tasks.map(t => ({ ...t, wsColor: ws.color, wsId: ws.id })));
  const taskMap = Object.fromEntries(allTasks.map(t => [t.id, t]));
  const todayTasks = todayPlan.taskIds.map(id => taskMap[id]).filter(Boolean);

  // Active tasks not in today's plan
  const todayIdSet = new Set(todayPlan.taskIds);
  const otherActive = allTasks.filter(t =>
    !todayIdSet.has(t.id) && t.status !== "DONE"
  );

  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dateLabel = `${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}`;

  const handleTriageSubmit = async () => {
    if (!triageInput.trim() || triageLoading) return;
    setTriageLoading(true);
    setTriageResponse(null);
    try {
      const response = await onTriageSubmit(triageInput);
      setTriageResponse(response);
      setTriageInput("");
    } catch (err) {
      setTriageResponse(`Error: ${err.message}`);
    }
    setTriageLoading(false);
  };

  const handleNoteBlur = () => {
    setEditingNote(false);
    if (noteInput !== todayPlan.userNote) {
      onUpdateTodayPlan({ userNote: noteInput });
    }
  };

  const handleLogBlur = () => {
    setEditingLog(false);
    if (logInput !== (todayPlan.log || "")) {
      onUpdateTodayPlan({ log: logInput });
    }
  };

  const handleSummarizeDay = async () => {
    if (logSummarizing) return;
    setLogSummarizing(true);
    try {
      const response = await onTriageSubmit("Summarize my day — write a daily log of what was accomplished, progress made, and any blockers.");
      // The agent should have used set_today_log action, but show the response too
      setTriageResponse(response);
    } catch (err) {
      setTriageResponse(`Error: ${err.message}`);
    }
    setLogSummarizing(false);
  };

  return (
    <div>
      {/* Date header */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: "14px", fontWeight: 700,
          color: "#E5E5EA", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px",
        }}>
          TODAY — {dateLabel}
        </div>
        {editingNote ? (
          <input
            autoFocus
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onBlur={handleNoteBlur}
            onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
            placeholder="What's the focus today?"
            style={{
              width: "100%", background: "#0D0D0F", color: "#E8A838", border: "1px solid #4A3A18",
              borderRadius: "6px", padding: "8px 12px", fontSize: "13px",
              fontFamily: "'DM Sans', sans-serif", fontStyle: "italic", outline: "none",
              boxSizing: "border-box",
            }}
          />
        ) : (
          <div
            onClick={() => { setNoteInput(todayPlan.userNote || ""); setEditingNote(true); }}
            style={{
              display: "flex", alignItems: "center", gap: "8px", cursor: "pointer",
              padding: "4px 0",
            }}
          >
            <span style={{
              fontSize: "13px", color: todayPlan.userNote ? "#E8A838" : "#4A4A4E",
              fontFamily: "'DM Sans', sans-serif", fontStyle: "italic", flex: 1,
            }}>
              {todayPlan.userNote || "Click to set today's focus..."}
            </span>
            <span style={{ fontSize: "10px", color: "#4A4A4E", fontFamily: "'JetBrains Mono', monospace" }}>edit</span>
          </div>
        )}
      </div>

      {/* Triage input */}
      <div style={{
        background: "#18181B", borderRadius: "10px", padding: "12px 16px",
        border: "1px solid #2A2A2E", marginBottom: "16px",
      }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            ref={inputRef}
            value={triageInput}
            onChange={e => setTriageInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTriageSubmit(); } }}
            placeholder="what should I work on today?"
            style={{
              flex: 1, background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #2A2A2E",
              borderRadius: "8px", padding: mobile ? "12px 14px" : "10px 14px", fontSize: "13px",
              fontFamily: "'DM Sans', sans-serif", outline: "none",
              minHeight: mobile ? "44px" : "auto",
            }}
            onFocus={e => e.target.style.borderColor = "#E8A838"}
            onBlur={e => e.target.style.borderColor = "#2A2A2E"}
          />
          <button
            onClick={handleTriageSubmit}
            disabled={triageLoading || !triageInput.trim()}
            style={{
              background: triageInput.trim() ? "linear-gradient(135deg, #E8A838, #E85B5B)" : "#2A2A2E",
              border: "none", borderRadius: "8px", padding: mobile ? "0 20px" : "0 16px",
              cursor: triageInput.trim() ? "pointer" : "default",
              color: triageInput.trim() ? "#0D0D0F" : "#4A4A4E", fontWeight: 700, fontSize: "14px",
              minHeight: mobile ? "44px" : "auto",
            }}
          >{triageLoading ? "..." : "→"}</button>
        </div>
        {triageResponse && (
          <div style={{
            marginTop: "10px", padding: "10px 12px", background: "#1C1C1E",
            borderRadius: "8px", border: "1px solid #2A2A2E",
            fontSize: "13px", color: "#E5E5EA", lineHeight: 1.5,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {triageResponse}
          </div>
        )}
      </div>

      {/* Priority Queue */}
      <div style={{
        background: "#18181B", borderRadius: "10px", padding: "16px",
        border: "1px solid #2A2A2E", marginBottom: "16px",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73",
          marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px",
        }}>
          Priority Queue {todayTasks.length > 0 && <span style={{ color: "#4A4A4E" }}>({todayTasks.length})</span>}
        </div>

        {todayTasks.length === 0 && (
          <div style={{
            color: "#3A3A3E", fontSize: "12px", fontFamily: "'DM Sans', sans-serif",
            textAlign: "center", padding: "20px 0", lineHeight: 1.8,
          }}>
            No tasks in today's plan yet.<br />
            <span style={{ color: "#4A4A4E" }}>Add tasks below or ask the agent to triage.</span>
          </div>
        )}

        {todayTasks.map((task, idx) => (
          <div key={task.id}>
            <div style={{
              display: "flex", gap: "4px", alignItems: "flex-start", marginBottom: "0",
              borderLeft: `3px solid ${task.wsColor || "#4A4A4E"}`,
              borderRadius: "2px",
              paddingLeft: "8px",
            }}>
              {/* Priority number badge */}
              <div style={{
                width: "22px", height: "22px", borderRadius: "50%",
                background: task.wsColor ? `${task.wsColor}22` : "#2A2A2E",
                border: `1px solid ${task.wsColor || "#4A4A4E"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: "8px",
              }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
                  fontWeight: 700, color: task.wsColor || "#8E8E93",
                }}>{idx + 1}</span>
              </div>
              {/* Reorder controls */}
              <div style={{
                display: "flex", flexDirection: "column", gap: "0px", paddingTop: "8px",
                flexShrink: 0, width: "20px", alignItems: "center",
              }}>
                <button
                  onClick={() => idx > 0 && onReorderToday(idx, idx - 1)}
                  disabled={idx === 0}
                  style={{
                    background: "transparent", border: "none", color: idx > 0 ? "#6E6E73" : "#2A2A2E",
                    cursor: idx > 0 ? "pointer" : "default", fontSize: "10px", padding: "0", lineHeight: 1,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >▲</button>
                <button
                  onClick={() => idx < todayTasks.length - 1 && onReorderToday(idx, idx + 1)}
                  disabled={idx === todayTasks.length - 1}
                  style={{
                    background: "transparent", border: "none",
                    color: idx < todayTasks.length - 1 ? "#6E6E73" : "#2A2A2E",
                    cursor: idx < todayTasks.length - 1 ? "pointer" : "default",
                    fontSize: "10px", padding: "0", lineHeight: 1,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >▼</button>
              </div>
              {/* Task content */}
              <div style={{ flex: 1 }}>
                <TaskRow
                  task={task}
                  wsColor={task.wsColor}
                  readOnly={false}
                  onStatusChange={onStatusChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleSubtask={onToggleSubtask}
                  onAddSubtask={onAddSubtask}
                  onDeleteSubtask={onDeleteSubtask}
                />
              </div>
              {/* Remove from today */}
              <button
                onClick={() => onRemoveFromToday(task.id)}
                title="Remove from today"
                style={{
                  background: "transparent", border: "none", color: "#4A4A4E",
                  cursor: "pointer", fontSize: "12px", padding: "10px 4px", flexShrink: 0,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >×</button>
            </div>
            {/* Separator line between tasks */}
            {idx < todayTasks.length - 1 && (
              <div style={{ height: "1px", background: "#2A2A2E", margin: "6px 0 6px 11px", opacity: 0.5 }} />
            )}
          </div>
        ))}

        {/* Add task picker */}
        <div style={{
          borderTop: todayTasks.length > 0 ? "1px dashed #2A2A2E" : "none",
          marginTop: todayTasks.length > 0 ? "8px" : 0,
          paddingTop: todayTasks.length > 0 ? "8px" : 0,
        }}>
          <button
            onClick={() => setShowPicker(!showPicker)}
            style={{
              background: "transparent", border: "1px dashed #3A3A3E", borderRadius: "6px",
              color: "#6E6E73", cursor: "pointer", fontSize: "11px", padding: "6px 12px",
              fontFamily: "'JetBrains Mono', monospace", width: "100%", textAlign: "left",
            }}
          >
            + add task to today
          </button>
          {showPicker && (
            <div style={{ marginTop: "8px", maxHeight: "200px", overflowY: "auto" }}>
              {otherActive.length === 0 ? (
                <div style={{ color: "#3A3A3E", fontSize: "11px", padding: "8px 0", textAlign: "center" }}>
                  No active tasks to add
                </div>
              ) : (
                otherActive.map(task => {
                  const c = STATUS_CONFIG[task.status] || STATUS_CONFIG["NOT STARTED"];
                  return (
                    <div
                      key={task.id}
                      onClick={() => { onAddToToday(task.id); setShowPicker(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px",
                        cursor: "pointer", borderRadius: "4px",
                        background: "transparent",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#1C1C1E"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
                        color: "#8E8E93", fontWeight: 600, minWidth: "48px",
                      }}>{task.id}</span>
                      <span style={{
                        fontSize: "12px", color: "#C5C5CA", flex: 1,
                        fontFamily: "'DM Sans', sans-serif",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{task.title}</span>
                      <span style={{
                        fontSize: "9px", fontFamily: "'JetBrains Mono', monospace",
                        color: c.fg, background: c.bg, border: `1px solid ${c.border}`,
                        padding: "1px 6px", borderRadius: "3px", flexShrink: 0,
                      }}>{task.status === "NOT STARTED" ? "NS" : task.status === "IN PROGRESS" ? "IP" : task.status === "WAITING" ? "W" : task.status}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Daily Log */}
      <div style={{
        background: "#18181B", borderRadius: "10px", padding: "16px",
        border: "1px solid #2A2A2E", marginBottom: "16px",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "10px",
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73",
            textTransform: "uppercase", letterSpacing: "1px",
          }}>
            Daily Log
          </div>
          <button
            onClick={handleSummarizeDay}
            disabled={logSummarizing}
            style={{
              background: "transparent", border: "1px solid #2A2A2E", borderRadius: "6px",
              color: logSummarizing ? "#4A4A4E" : "#6CC4A1", cursor: logSummarizing ? "default" : "pointer",
              fontSize: "10px", padding: "4px 10px",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {logSummarizing ? "summarizing..." : "ask agent to summarize"}
          </button>
        </div>

        {editingLog ? (
          <textarea
            autoFocus
            value={logInput}
            onChange={e => setLogInput(e.target.value)}
            onBlur={handleLogBlur}
            placeholder="Write today's log..."
            style={{
              width: "100%", background: "#0D0D0F", color: "#C5C5CA",
              border: "1px solid #2A2A2E", borderRadius: "6px",
              padding: "10px 12px", fontSize: "12px", lineHeight: 1.6,
              fontFamily: "'DM Sans', sans-serif", outline: "none",
              boxSizing: "border-box", resize: "vertical", minHeight: "80px",
            }}
          />
        ) : (
          <div
            onClick={() => { setLogInput(todayPlan.log || ""); setEditingLog(true); }}
            style={{
              cursor: "pointer", padding: "8px 12px", background: "#1C1C1E",
              borderRadius: "6px", minHeight: "40px",
            }}
          >
            {todayPlan.log ? (
              todayPlan.log.split("\n").map((line, i) => (
                <p key={i} style={{
                  margin: i === 0 ? 0 : "6px 0 0 0", fontSize: "12px", color: "#C5C5CA",
                  lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif",
                }}>
                  {line || "\u00A0"}
                </p>
              ))
            ) : (
              <span style={{
                fontSize: "12px", color: "#3A3A3E", fontStyle: "italic",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Click to write today's log, or ask the agent to summarize...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Other Active section */}
      {otherActive.length > 0 && !showPicker && (
        <div style={{
          background: "#18181B", borderRadius: "10px", padding: "16px",
          border: "1px solid #2A2A2E",
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#4A4A4E",
            marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px",
          }}>
            Other Active <span style={{ color: "#3A3A3E" }}>({otherActive.length})</span>
          </div>
          {otherActive.map(task => {
            const c = STATUS_CONFIG[task.status] || STATUS_CONFIG["NOT STARTED"];
            return (
              <div
                key={task.id}
                onClick={() => onAddToToday(task.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px",
                  cursor: "pointer", borderRadius: "4px", marginBottom: "2px",
                  background: "transparent",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#1C1C1E"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
                  color: "#8E8E93", fontWeight: 600, minWidth: "48px",
                }}>{task.id}</span>
                <span style={{
                  fontSize: "12px", color: "#8E8E93", flex: 1,
                  fontFamily: "'DM Sans', sans-serif",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{task.title}</span>
                <span style={{
                  fontSize: "9px", fontFamily: "'JetBrains Mono', monospace",
                  color: c.fg, background: c.bg, border: `1px solid ${c.border}`,
                  padding: "1px 6px", borderRadius: "3px", flexShrink: 0,
                }}>{task.status === "NOT STARTED" ? "NS" : task.status === "IN PROGRESS" ? "IP" : task.status === "WAITING" ? "W" : task.status}</span>
                <span style={{ fontSize: "10px", color: "#3A3A3E" }}>+</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
