import { useState, useRef, useEffect, useMemo } from "react";
import { STATUS_CONFIG, TYPE_ICONS } from "../lib/constants.js";
import { useIsMobile } from "../hooks/useMediaQuery.js";
import TaskRow from "./TaskRow.jsx";
import MorningIntake from "./MorningIntake.jsx";

// ── Helpers ────────────────────────────────────────────────────────

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayLong = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function todayIso() { return new Date().toISOString().slice(0, 10); }

// Pick the most-urgent open subtask for an at-a-glance subtitle.
// Order of preference: overdue → due within 2 days → first not-done.
function nextOpenSubtask(task) {
  const subs = task?.subtasks || [];
  if (!subs.length) return null;
  const open = subs.filter(s => !s.done);
  if (!open.length) return null;
  const now = Date.now();
  const overdue = open.find(s => s.dueDate && new Date(s.dueDate + "T23:59:59").getTime() < now);
  if (overdue) return overdue;
  const soon = open.find(s => s.dueDate && new Date(s.dueDate + "T23:59:59").getTime() - now < TWO_DAYS);
  if (soon) return soon;
  return open[0];
}

function fmtSubDue(iso) {
  const d = new Date(iso + "T12:00:00");
  return `${monthShort[d.getMonth()]} ${d.getDate()}`;
}

// Mon..Sat for the calendar week containing `date`
function weekDates(refDate) {
  const d = new Date(refDate + "T12:00:00");
  const dow = d.getDay();
  const offsetToMon = dow === 0 ? -6 : 1 - dow;
  const out = [];
  for (let i = 0; i < 6; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + offsetToMon + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function fmtDateLong(iso) {
  const d = new Date(iso + "T12:00:00");
  return `${dayLong[d.getDay()]}, ${monthLong[d.getMonth()]} ${d.getDate()}`;
}

function fmtDateShort(iso) {
  const d = new Date(iso + "T12:00:00");
  return `${dayShort[d.getDay()]} ${monthShort[d.getMonth()]} ${d.getDate()}`;
}

// ── Sub-components ─────────────────────────────────────────────────

function DayRail({ dates, viewingDate, todayDate, onSelect, dailyLogs, todayPlan }) {
  return (
    <div style={{
      display: "flex", gap: "4px", marginBottom: "16px",
      overflowX: "auto", paddingBottom: "2px",
    }}>
      {dates.map(date => {
        const isToday = date === todayDate;
        const isViewing = date === viewingDate;
        const isFuture = date > todayDate;
        const log = dailyLogs?.[date];
        const plan = isToday ? todayPlan : log;
        const taskCount = plan?.taskIds?.length || 0;

        // Status: any incomplete carryover?
        let carryover = false;
        if (!isToday && log?.taskStatusSnap) {
          carryover = (log.taskIds || []).some(id => log.taskStatusSnap[id] && log.taskStatusSnap[id] !== "DONE");
        }

        const d = new Date(date + "T12:00:00");
        return (
          <button
            key={date}
            onClick={() => !isFuture && onSelect(date)}
            disabled={isFuture}
            title={fmtDateLong(date)}
            style={{
              flexShrink: 0, minWidth: "62px",
              background: isViewing ? "#2A2A2E" : "transparent",
              border: `1px solid ${isViewing ? "#4A4A4E" : "#222226"}`,
              borderRadius: "8px", padding: "6px 10px", cursor: isFuture ? "default" : "pointer",
              opacity: isFuture ? 0.35 : 1,
              fontFamily: "'JetBrains Mono', monospace",
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px",
            }}
          >
            <span style={{ fontSize: "9px", color: "#6E6E73", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {dayShort[d.getDay()]}
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: isToday ? "#E8A838" : "#E5E5EA" }}>
              {d.getDate()}
            </span>
            <span style={{ fontSize: "9px", color: "#6E6E73", display: "flex", alignItems: "center", gap: "3px" }}>
              {taskCount > 0 ? `${taskCount}` : "·"}
              {carryover && <span style={{ color: "#E85B5B" }}>*</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FocusCallout({ focus, onEdit, isEditing, value, setValue, onSave, accentColor, isReadOnly }) {
  const accent = accentColor || "#E8A838";
  if (isEditing) {
    return (
      <div style={{
        background: "#18181B",
        border: `1px solid ${accent}66`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: "10px", padding: "14px 18px", marginBottom: "16px",
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
          color: "#6E6E73", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px",
        }}>Today's focus</div>
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={onSave}
          onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
          placeholder="What's the focus today?"
          style={{
            width: "100%", background: "transparent", color: "#E5E5EA",
            border: "none", outline: "none",
            fontSize: "16px", fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif", fontStyle: "italic",
            boxSizing: "border-box",
          }}
        />
      </div>
    );
  }
  return (
    <div
      onClick={() => !isReadOnly && onEdit()}
      style={{
        background: focus
          ? `linear-gradient(135deg, ${accent}18 0%, #18181B 100%)`
          : "#18181B",
        border: `1px solid ${accent}33`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: "10px", padding: "14px 18px", marginBottom: "16px",
        cursor: isReadOnly ? "default" : "pointer",
        transition: "background 0.15s",
      }}
    >
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
        color: "#6E6E73", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span>Today's focus</span>
        {!isReadOnly && <span style={{ fontSize: "9px", color: "#3A3A3E" }}>click to edit</span>}
      </div>
      <div style={{
        fontSize: focus ? "16px" : "13px", fontWeight: 500,
        color: focus ? "#E5E5EA" : "#4A4A4E",
        fontFamily: "'DM Sans', sans-serif",
        fontStyle: focus ? "italic" : "normal", lineHeight: 1.4,
      }}>
        {focus ? `"${focus}"` : "Click to set today's focus…"}
      </div>
    </div>
  );
}

function StatTile({ value, label, accent }) {
  return (
    <div style={{
      flex: "1 1 0", minWidth: "80px",
      background: "#1C1C1E", borderRadius: "8px", padding: "8px 12px",
      border: "1px solid #2A2A2E",
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: "20px", fontWeight: 700,
        color: accent || "#E5E5EA", lineHeight: 1.1,
      }}>{value}</div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: "9px",
        color: "#6E6E73", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "2px",
      }}>{label}</div>
    </div>
  );
}

function NowPinSection({ task, wsColor, onClear, onClick }) {
  if (!task) return null;
  return (
    <div
      onClick={onClick}
      style={{
        background: `linear-gradient(90deg, ${wsColor || "#6CC4A1"}22 0%, #1C1C1E 100%)`,
        border: `1px solid ${wsColor || "#6CC4A1"}66`,
        borderRadius: "8px", padding: "10px 14px", marginBottom: "12px",
        display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
      }}
    >
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: "9px",
        color: wsColor || "#6CC4A1", fontWeight: 700, letterSpacing: "1px",
      }}>▶ NOW</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
        color: "#8E8E93", fontWeight: 600,
      }}>{task.id}</span>
      <span style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
        color: "#E5E5EA", flex: 1,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{task.title}</span>
      <button
        onClick={e => { e.stopPropagation(); onClear(); }}
        title="Unpin"
        style={{
          background: "transparent", border: "1px solid #2A2A2E", borderRadius: "4px",
          color: "#6E6E73", fontSize: "10px", padding: "3px 8px",
          fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
        }}
      >unpin</button>
    </div>
  );
}

function StalledNudges({ stalled, onNudge }) {
  if (!stalled.length) return null;
  return (
    <div style={{ marginBottom: "12px" }}>
      {stalled.map(s => (
        <div key={s.id} style={{
          background: "#2A1A1A", border: "1px solid #4A2A2A", borderRadius: "8px",
          padding: "8px 14px", marginBottom: "6px",
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          <span style={{ fontSize: "12px" }}>⚠</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
            color: "#E85B5B", fontWeight: 600,
          }}>{s.id}</span>
          <span style={{
            fontSize: "12px", color: "#C5C5CA",
            fontFamily: "'DM Sans', sans-serif", flex: 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{s.reason}</span>
          <button
            onClick={() => onNudge(s)}
            style={{
              background: "transparent", border: "1px solid #4A2A2A", borderRadius: "4px",
              color: "#E85B5B", fontSize: "10px", padding: "3px 8px",
              fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
            }}
          >ask agent →</button>
        </div>
      ))}
    </div>
  );
}

function CondensedRow({ task, idx, expanded, onToggleExpand, onSetNow, isPinned, isReadOnly,
                       onStatusChange, onEdit, onDelete, onToggleSubtask, onAddSubtask, onDeleteSubtask,
                       onMoveUp, onMoveDown, onRemove, canMoveUp, canMoveDown }) {
  const c = STATUS_CONFIG[task.status] || STATUS_CONFIG["NOT STARTED"];
  const subs = task.subtasks || [];
  const doneSubs = subs.filter(s => s.done).length;
  const subPct = subs.length > 0 ? Math.round((doneSubs / subs.length) * 100) : 0;
  const activeSub = nextOpenSubtask(task);

  // Find soonest urgent subtask due-date
  let urgentBadge = null;
  for (const s of subs) {
    if (s.done || !s.dueDate) continue;
    const ms = new Date(s.dueDate + "T23:59:59").getTime() - Date.now();
    if (ms < 0) {
      urgentBadge = { label: `⚠ ${fmtSubDue(s.dueDate)}`, color: "#E85B5B" };
      break;
    } else if (ms < TWO_DAYS && !urgentBadge) {
      urgentBadge = { label: `⏰ ${fmtSubDue(s.dueDate)}`, color: "#E8A838" };
    }
  }

  return (
    <div style={{
      borderLeft: `3px solid ${task.wsColor || "#3A3A3E"}`,
      background: expanded ? "#1C1C1E" : "transparent",
      borderRadius: "0 8px 8px 0",
      marginBottom: "4px",
      transition: "background 0.15s",
    }}>
      <div
        onClick={onToggleExpand}
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "8px 12px", cursor: "pointer",
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = "#1A1A1D"; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = "transparent"; }}
      >
        {/* Priority number / now-pin star */}
        <button
          onClick={e => { e.stopPropagation(); onSetNow(); }}
          title={isPinned ? "Currently working on this" : "Set as 'now'"}
          style={{
            width: "22px", height: "22px", borderRadius: "50%",
            background: isPinned ? task.wsColor || "#6CC4A1" : (task.wsColor ? `${task.wsColor}22` : "#2A2A2E"),
            border: `1px solid ${task.wsColor || "#4A4A4E"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, padding: 0, cursor: isReadOnly ? "default" : "pointer",
          }}
        >
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700,
            color: isPinned ? "#0D0D0F" : (task.wsColor || "#8E8E93"),
          }}>{isPinned ? "▶" : idx + 1}</span>
        </button>

        {/* ID */}
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
          color: "#8E8E93", fontWeight: 600, minWidth: "44px",
        }}>{task.id}</span>

        {/* Type icon */}
        <span style={{ fontSize: "11px", color: "#6E6E73", width: "14px", flexShrink: 0 }}>{TYPE_ICONS[task.type] || "○"}</span>

        {/* Title + active subtask subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "13px", color: task.status === "DONE" ? "#6E6E73" : "#E5E5EA",
            textDecoration: task.status === "DONE" ? "line-through" : "none",
            fontFamily: "'DM Sans', sans-serif",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: expanded ? "normal" : "nowrap",
          }}>{task.title}</div>
          {!expanded && activeSub && (
            <div style={{
              fontSize: "11px", color: "#8E8E93",
              fontFamily: "'DM Sans', sans-serif",
              marginTop: "2px", display: "flex", alignItems: "center", gap: "6px",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              <span style={{ color: "#4A4A4E", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>↳</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeSub.title}
              </span>
              {activeSub.dueDate && (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "9px",
                  color: new Date(activeSub.dueDate + "T23:59:59").getTime() < Date.now() ? "#E85B5B" : "#6E6E73",
                  flexShrink: 0,
                }}>· {fmtSubDue(activeSub.dueDate)}</span>
              )}
            </div>
          )}
        </div>

        {/* Subtask progress bar */}
        {subs.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <div style={{ width: "32px", height: "4px", background: "#2A2A2E", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${subPct}%`, height: "100%", background: task.wsColor || "#6CC4A1" }} />
            </div>
            <span style={{ fontSize: "9px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace" }}>
              {doneSubs}/{subs.length}
            </span>
          </div>
        )}

        {/* Urgent badge */}
        {urgentBadge && (
          <span style={{
            fontSize: "9px", fontFamily: "'JetBrains Mono', monospace",
            color: urgentBadge.color, padding: "1px 6px", borderRadius: "3px",
            border: `1px solid ${urgentBadge.color}44`, flexShrink: 0,
          }}>{urgentBadge.label}</span>
        )}

        {/* Status pill */}
        <span style={{
          fontSize: "9px", fontFamily: "'JetBrains Mono', monospace",
          color: c.fg, background: c.bg, border: `1px solid ${c.border}`,
          padding: "1px 6px", borderRadius: "3px", flexShrink: 0,
          textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          {task.status === "NOT STARTED" ? "NS" : task.status === "IN PROGRESS" ? "IP" : task.status === "WAITING" ? "W" : "✓"}
        </span>

        {/* Expand chevron */}
        <span style={{
          color: "#4A4A4E", fontSize: "10px",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s",
        }}>▶</span>
      </div>

      {/* Expanded full TaskRow */}
      {expanded && (
        <div style={{ padding: "0 8px 8px 8px" }}>
          <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "0 4px 6px 4px" }}>
            <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={!canMoveUp || isReadOnly}
              style={{
                background: "transparent", border: "1px solid #2A2A2E", borderRadius: "3px",
                color: canMoveUp ? "#6E6E73" : "#2A2A2E", cursor: canMoveUp ? "pointer" : "default",
                fontSize: "10px", padding: "2px 8px", fontFamily: "'JetBrains Mono', monospace",
              }}>▲ up</button>
            <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={!canMoveDown || isReadOnly}
              style={{
                background: "transparent", border: "1px solid #2A2A2E", borderRadius: "3px",
                color: canMoveDown ? "#6E6E73" : "#2A2A2E", cursor: canMoveDown ? "pointer" : "default",
                fontSize: "10px", padding: "2px 8px", fontFamily: "'JetBrains Mono', monospace",
              }}>▼ down</button>
            <div style={{ flex: 1 }} />
            {!isReadOnly && (
              <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
                style={{
                  background: "transparent", border: "1px solid #2A2A2E", borderRadius: "3px",
                  color: "#6E6E73", cursor: "pointer",
                  fontSize: "10px", padding: "2px 8px", fontFamily: "'JetBrains Mono', monospace",
                }}>× remove from today</button>
            )}
          </div>
          <TaskRow
            task={task}
            wsColor={task.wsColor}
            readOnly={isReadOnly}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleSubtask={onToggleSubtask}
            onAddSubtask={onAddSubtask}
            onDeleteSubtask={onDeleteSubtask}
          />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

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
  onSetNowPin,
  onClearNowPin,
  onAcceptTomorrowDraft,
  onDismissTomorrowDraft,
  onAcceptProposal,
  onSkipProposal,
  onEditProposal,
  onFinishMorningIntake,
  onSkipMorningIntake,
  onIterateMorningIntake,
  onOpenAgent,
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
  const [endOfDayLoading, setEndOfDayLoading] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [expandedOtherId, setExpandedOtherId] = useState(null);
  const [viewingDate, setViewingDate] = useState(todayIso());
  const inputRef = useRef(null);

  const todayDate = todayIso();
  const isViewingToday = viewingDate === todayDate;
  const isReadOnly = !isViewingToday;

  // Sync log input when external changes happen (agent writes log, day changes)
  useEffect(() => {
    if (!editingLog) setLogInput(todayPlan.log || "");
  }, [todayPlan.log, editingLog]);
  useEffect(() => {
    setNoteInput(todayPlan.userNote || "");
  }, [todayPlan.userNote]);

  // ── Resolve tasks ────────────────────────────────────────────────
  const allTasks = useMemo(
    () => data.workstreams.flatMap(ws => ws.tasks.map(t => ({ ...t, wsColor: ws.color, wsId: ws.id, wsName: ws.name }))),
    [data.workstreams]
  );
  const taskMap = useMemo(() => Object.fromEntries(allTasks.map(t => [t.id, t])), [allTasks]);

  // What plan are we showing? (today, or a historical day)
  const viewingPlan = useMemo(() => {
    if (isViewingToday) return todayPlan;
    const log = data.dailyLogs?.[viewingDate];
    return log
      ? { date: viewingDate, taskIds: log.taskIds || [], userNote: log.userNote || "", log: log.log || "" }
      : { date: viewingDate, taskIds: [], userNote: "", log: "" };
  }, [isViewingToday, todayPlan, data.dailyLogs, viewingDate]);

  const viewingTasks = (viewingPlan.taskIds || []).map(id => {
    const live = taskMap[id];
    if (live) return live;
    // Historical task that no longer exists — synthesize from snapshot
    const snap = data.dailyLogs?.[viewingDate];
    if (snap?.taskTitleSnap?.[id]) {
      return {
        id,
        title: snap.taskTitleSnap[id],
        status: snap.taskStatusSnap?.[id] || "NOT STARTED",
        type: "--",
        wsColor: "#4A4A4E",
        archived: true,
      };
    }
    return null;
  }).filter(Boolean);

  // ── Stat tiles ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    const planTasks = viewingTasks;
    const done = planTasks.filter(t => t.status === "DONE").length;
    const active = planTasks.filter(t => t.status === "IN PROGRESS").length;
    const total = planTasks.length;

    let overdueSubs = 0;
    let dueSoon = 0;
    for (const t of planTasks) {
      for (const s of t.subtasks || []) {
        if (s.done || !s.dueDate) continue;
        const ms = new Date(s.dueDate + "T23:59:59").getTime() - Date.now();
        if (ms < 0) overdueSubs++;
        else if (ms < TWO_DAYS) dueSoon++;
      }
    }
    return { done, active, total, overdueSubs, dueSoon };
  }, [viewingTasks]);

  // ── Stalled nudges ──────────────────────────────────────────────
  const stalledNudges = useMemo(() => {
    if (!isViewingToday) return [];
    const out = [];

    // Long-WAITING tasks
    const waiting = allTasks.filter(t => t.status === "WAITING");
    for (const t of waiting.slice(0, 2)) {
      out.push({
        id: t.id,
        reason: `WAITING — ${t.stakeholders?.length ? `chase ${t.stakeholders.join("/")}?` : "blocked"}`,
        prompt: `Help me unblock ${t.id} (${t.title}). It's been WAITING. What's the next move?`,
      });
    }

    // Rollover detection
    const dailyDates = Object.keys(data.dailyLogs || {}).sort();
    for (const id of todayPlan.taskIds || []) {
      const t = taskMap[id];
      if (!t || t.status === "DONE") continue;
      let count = 0;
      for (const d of dailyDates) {
        if (data.dailyLogs[d]?.taskIds?.includes(id)) count++;
      }
      if (count >= 3) {
        out.push({
          id,
          reason: `Rolled over ${count} days — split or close?`,
          prompt: `${t.id} has been on my daily plan for ${count} days without finishing. What should I do — break it up, defer it, or push through?`,
        });
      }
    }
    return out.slice(0, 3);
  }, [isViewingToday, allTasks, data.dailyLogs, todayPlan.taskIds, taskMap]);

  // ── Tomorrow draft banner ────────────────────────────────────────
  const tomorrowDraft = data.tomorrowDraft;
  const showTomorrowDraft = isViewingToday && tomorrowDraft?.taskIds?.length && (todayPlan.taskIds || []).length === 0;

  // ── Now pin ─────────────────────────────────────────────────────
  const nowPinTask = data.nowPinTaskId ? taskMap[data.nowPinTaskId] : null;

  // ── Other Active ────────────────────────────────────────────────
  const todayIdSet = new Set(todayPlan.taskIds || []);
  const otherActive = isViewingToday
    ? allTasks.filter(t => !todayIdSet.has(t.id) && t.status !== "DONE")
    : [];

  // ── Focus accent: workstream color of pinned task or first priority ──
  const accentColor = nowPinTask?.wsColor || viewingTasks[0]?.wsColor || "#E8A838";

  // ── Day rail dates ──────────────────────────────────────────────
  const railDates = weekDates(todayDate);

  // ── Handlers ────────────────────────────────────────────────────
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
    if (noteInput !== todayPlan.userNote) onUpdateTodayPlan({ userNote: noteInput });
  };

  const handleLogBlur = () => {
    setEditingLog(false);
    if (logInput !== (todayPlan.log || "")) onUpdateTodayPlan({ log: logInput });
  };

  const handleSummarizeDay = async () => {
    if (logSummarizing) return;
    setLogSummarizing(true);
    try {
      const response = await onTriageSubmit(
        "Summarize my day — write a daily log of what was accomplished, progress made, and any blockers. Use set_today_log."
      );
      setTriageResponse(response);
    } catch (err) {
      setTriageResponse(`Error: ${err.message}`);
    }
    setLogSummarizing(false);
  };

  const handleEndOfDay = async () => {
    if (endOfDayLoading) return;
    setEndOfDayLoading(true);
    try {
      const response = await onTriageSubmit(
        "End of day. (1) Call set_today_log with today's accomplishments, progress, and blockers. " +
        "(2) Call draft_tomorrow_plan with a prioritized list of taskIds for tomorrow plus a one-line userNote " +
        "naming the focus. Don't apply set_today_plan — just draft."
      );
      setTriageResponse(response);
    } catch (err) {
      setTriageResponse(`Error: ${err.message}`);
    }
    setEndOfDayLoading(false);
  };

  const handleStalledNudge = async (s) => {
    setTriageLoading(true);
    setTriageResponse(null);
    try {
      const response = await onTriageSubmit(s.prompt);
      setTriageResponse(response);
    } catch (err) {
      setTriageResponse(`Error: ${err.message}`);
    }
    setTriageLoading(false);
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div>
      {/* Date heading */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: "14px", fontWeight: 700,
          color: "#E5E5EA", textTransform: "uppercase", letterSpacing: "1px",
        }}>
          {isViewingToday ? "Today" : "Reviewing"} — {fmtDateLong(viewingDate)}
        </div>
      </div>

      {/* Day rail (B) */}
      <DayRail
        dates={railDates}
        viewingDate={viewingDate}
        todayDate={todayDate}
        onSelect={(d) => { setViewingDate(d); setExpandedTaskId(null); }}
        dailyLogs={data.dailyLogs}
        todayPlan={todayPlan}
      />

      {/* Read-only history banner */}
      {!isViewingToday && (
        <div style={{
          background: "#1C1C1E", border: "1px solid #2A2A2E", borderRadius: "8px",
          padding: "8px 14px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px",
        }}>
          <span style={{
            fontSize: "10px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace",
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>history · read-only</span>
          <button
            onClick={() => setViewingDate(todayDate)}
            style={{
              background: "transparent", border: "1px solid #2A2A2E", borderRadius: "4px",
              color: "#6CC4A1", fontSize: "10px", padding: "3px 10px",
              fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
            }}
          >back to today →</button>
        </div>
      )}

      {/* Focus card callout (A) */}
      <FocusCallout
        focus={viewingPlan.userNote}
        onEdit={() => { setNoteInput(todayPlan.userNote || ""); setEditingNote(true); }}
        isEditing={editingNote && isViewingToday}
        value={noteInput}
        setValue={setNoteInput}
        onSave={handleNoteBlur}
        accentColor={accentColor}
        isReadOnly={isReadOnly}
      />

      {/* Stat tiles */}
      {viewingTasks.length > 0 && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
          <StatTile value={`${stats.done}/${stats.total}`} label="done today" accent="#5B8DEF" />
          <StatTile value={stats.active} label="in progress" accent="#6CC4A1" />
          {stats.overdueSubs > 0 && <StatTile value={stats.overdueSubs} label="overdue subs" accent="#E85B5B" />}
          {stats.dueSoon > 0 && <StatTile value={stats.dueSoon} label="due soon" accent="#E8A838" />}
        </div>
      )}

      {/* Tomorrow draft banner */}
      {showTomorrowDraft && (
        <div style={{
          background: "linear-gradient(90deg, #1A2A1A 0%, #18181B 100%)",
          border: "1px solid #2A4A2A", borderRadius: "8px",
          padding: "10px 14px", marginBottom: "12px",
          display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "10px", color: "#6CC4A1", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.5px" }}>
            ✦ AGENT-DRAFTED PLAN
          </span>
          <span style={{ fontSize: "12px", color: "#C5C5CA", fontFamily: "'DM Sans', sans-serif", flex: 1 }}>
            {tomorrowDraft.userNote || `${tomorrowDraft.taskIds.length} tasks ready`}
          </span>
          <button
            onClick={onAcceptTomorrowDraft}
            style={{
              background: "#6CC4A1", color: "#0D0D0F", border: "none", borderRadius: "4px",
              fontSize: "11px", padding: "4px 12px", fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
            }}
          >accept →</button>
          <button
            onClick={onDismissTomorrowDraft}
            style={{
              background: "transparent", border: "1px solid #2A2A2E", borderRadius: "4px",
              color: "#6E6E73", fontSize: "11px", padding: "4px 10px",
              fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
            }}
          >dismiss</button>
        </div>
      )}

      {/* Stalled nudges (#5) */}
      <StalledNudges stalled={stalledNudges} onNudge={handleStalledNudge} />

      {/* Now pin (#1) */}
      {isViewingToday && (
        <NowPinSection
          task={nowPinTask}
          wsColor={nowPinTask?.wsColor}
          onClear={onClearNowPin}
          onClick={() => nowPinTask && setExpandedTaskId(nowPinTask.id)}
        />
      )}

      {/* Morning intake (per-proposal review) */}
      {isViewingToday && (
        <MorningIntake
          intake={data.morningIntake?.[todayDate]}
          data={data}
          onAcceptProposal={onAcceptProposal}
          onSkipProposal={onSkipProposal}
          onEditProposal={onEditProposal}
          onFinish={onFinishMorningIntake}
          onSkipIntake={onSkipMorningIntake}
          onIterate={onIterateMorningIntake}
          onOpenAgent={onOpenAgent}
        />
      )}

      {/* Triage input */}
      {isViewingToday && (
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
              placeholder="ask the agent…"
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
            >{triageLoading ? "…" : "→"}</button>
          </div>
          {triageResponse && (
            <div style={{
              marginTop: "10px", padding: "10px 12px", background: "#1C1C1E",
              borderRadius: "8px", border: "1px solid #2A2A2E",
              fontSize: "13px", color: "#E5E5EA", lineHeight: 1.5,
              fontFamily: "'DM Sans', sans-serif", whiteSpace: "pre-wrap",
            }}>{triageResponse}</div>
          )}
        </div>
      )}

      {/* Priority Queue (condensed) */}
      <div style={{
        background: "#18181B", borderRadius: "10px", padding: "12px 14px",
        border: "1px solid #2A2A2E", marginBottom: "16px",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73",
          marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          Priority Queue
          {viewingTasks.length > 0 && (
            <span style={{ color: "#4A4A4E", fontSize: "11px" }}>({viewingTasks.length})</span>
          )}
        </div>

        {viewingTasks.length === 0 && (
          <div style={{
            color: "#3A3A3E", fontSize: "12px", fontFamily: "'DM Sans', sans-serif",
            textAlign: "center", padding: "16px 0", lineHeight: 1.8,
          }}>
            {isViewingToday ? (
              <>No tasks in today's plan yet.<br />
                <span style={{ color: "#4A4A4E" }}>Add below or ask the agent to triage.</span></>
            ) : (
              <>No priority queue captured for this day.</>
            )}
          </div>
        )}

        {viewingTasks.map((task, idx) => (
          <CondensedRow
            key={task.id}
            task={task}
            idx={idx}
            expanded={expandedTaskId === task.id}
            onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
            onSetNow={() => !isReadOnly && onSetNowPin(task.id)}
            isPinned={data.nowPinTaskId === task.id}
            isReadOnly={isReadOnly}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleSubtask={onToggleSubtask}
            onAddSubtask={onAddSubtask}
            onDeleteSubtask={onDeleteSubtask}
            onMoveUp={() => idx > 0 && onReorderToday(idx, idx - 1)}
            onMoveDown={() => idx < viewingTasks.length - 1 && onReorderToday(idx, idx + 1)}
            canMoveUp={idx > 0}
            canMoveDown={idx < viewingTasks.length - 1}
            onRemove={() => onRemoveFromToday(task.id)}
          />
        ))}

        {/* Add task picker (today only) */}
        {isViewingToday && (
          <div style={{
            borderTop: viewingTasks.length > 0 ? "1px dashed #2A2A2E" : "none",
            marginTop: viewingTasks.length > 0 ? "8px" : 0,
            paddingTop: viewingTasks.length > 0 ? "8px" : 0,
          }}>
            <button
              onClick={() => setShowPicker(!showPicker)}
              style={{
                background: "transparent", border: "1px dashed #3A3A3E", borderRadius: "6px",
                color: "#6E6E73", cursor: "pointer", fontSize: "11px", padding: "6px 12px",
                fontFamily: "'JetBrains Mono', monospace", width: "100%", textAlign: "left",
              }}
            >+ add task to today</button>
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
                          cursor: "pointer", borderRadius: "4px", background: "transparent",
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
        )}
      </div>

      {/* End of day button (#2) — today only */}
      {isViewingToday && (todayPlan.taskIds || []).length > 0 && (
        <button
          onClick={handleEndOfDay}
          disabled={endOfDayLoading}
          style={{
            width: "100%", background: "#1C1C1E",
            border: "1px solid #2A2A2E", borderRadius: "8px",
            color: endOfDayLoading ? "#4A4A4E" : "#5B8DEF",
            fontSize: "12px", padding: "10px 14px", marginBottom: "16px",
            fontFamily: "'JetBrains Mono', monospace", cursor: endOfDayLoading ? "default" : "pointer",
            textAlign: "center", letterSpacing: "0.5px",
          }}
          onMouseEnter={e => { if (!endOfDayLoading) e.currentTarget.style.background = "#222226"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#1C1C1E"; }}
        >
          {endOfDayLoading
            ? "⬡ summarizing & drafting tomorrow…"
            : "▣ End of day — write log + draft tomorrow's plan"}
        </button>
      )}

      {/* Daily Log */}
      <div style={{
        background: "#18181B", borderRadius: "10px", padding: "16px",
        border: "1px solid #2A2A2E", marginBottom: "16px",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px",
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73",
            textTransform: "uppercase", letterSpacing: "1px",
          }}>{isViewingToday ? "Daily Log" : "Log"}</div>
          {isViewingToday && (
            <button
              onClick={handleSummarizeDay}
              disabled={logSummarizing}
              style={{
                background: "transparent", border: "1px solid #2A2A2E", borderRadius: "6px",
                color: logSummarizing ? "#4A4A4E" : "#6CC4A1", cursor: logSummarizing ? "default" : "pointer",
                fontSize: "10px", padding: "4px 10px", fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {logSummarizing ? "summarizing…" : "ask agent to summarize"}
            </button>
          )}
        </div>

        {isViewingToday && editingLog ? (
          <textarea
            autoFocus
            value={logInput}
            onChange={e => setLogInput(e.target.value)}
            onBlur={handleLogBlur}
            placeholder="Write today's log…"
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
            onClick={() => {
              if (!isViewingToday) return;
              setLogInput(todayPlan.log || "");
              setEditingLog(true);
            }}
            style={{
              cursor: isViewingToday ? "pointer" : "default",
              padding: "8px 12px", background: "#1C1C1E",
              borderRadius: "6px", minHeight: "40px",
            }}
          >
            {viewingPlan.log ? (
              viewingPlan.log.split("\n").map((line, i) => (
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
                {isViewingToday
                  ? "Click to write today's log, or ask the agent to summarize…"
                  : "No log written for this day."}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Other Active section (today only) */}
      {isViewingToday && otherActive.length > 0 && !showPicker && (
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
            const openSubs = (task.subtasks || []).filter(s => !s.done);
            const isOpen = expandedOtherId === task.id;
            const activeSub = nextOpenSubtask(task);
            return (
              <div
                key={task.id}
                style={{
                  borderLeft: `2px solid ${task.wsColor || "#3A3A3E"}`,
                  background: isOpen ? "#1C1C1E" : "transparent",
                  borderRadius: "0 6px 6px 0",
                  marginBottom: "3px",
                  transition: "background 0.15s",
                }}
              >
                <div
                  onClick={() => setExpandedOtherId(isOpen ? null : task.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.parentElement.style.background = "#161618"; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.parentElement.style.background = "transparent"; }}
                >
                  <span style={{
                    color: "#4A4A4E", fontSize: "9px", flexShrink: 0,
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s",
                  }}>▶</span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
                    color: "#8E8E93", fontWeight: 600, minWidth: "48px", flexShrink: 0,
                  }}>{task.id}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "12px", color: "#C5C5CA",
                      fontFamily: "'DM Sans', sans-serif",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{task.title}</div>
                    {!isOpen && activeSub && (
                      <div style={{
                        fontSize: "10px", color: "#6E6E73",
                        fontFamily: "'DM Sans', sans-serif",
                        marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        <span style={{ color: "#3A3A3E", fontFamily: "'JetBrains Mono', monospace" }}>↳ </span>
                        {activeSub.title}
                        {openSubs.length > 1 && (
                          <span style={{ color: "#4A4A4E" }}> · +{openSubs.length - 1}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: "9px", fontFamily: "'JetBrains Mono', monospace",
                    color: c.fg, background: c.bg, border: `1px solid ${c.border}`,
                    padding: "1px 6px", borderRadius: "3px", flexShrink: 0,
                  }}>{task.status === "NOT STARTED" ? "NS" : task.status === "IN PROGRESS" ? "IP" : task.status === "WAITING" ? "W" : task.status}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddToToday(task.id); }}
                    title="Add to today"
                    style={{
                      background: "transparent", border: "1px solid #2A2A2E", borderRadius: "4px",
                      color: "#6CC4A1", fontSize: "10px", padding: "2px 8px",
                      fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", flexShrink: 0,
                    }}
                  >+ today</button>
                </div>
                {isOpen && (
                  <div style={{ padding: "0 12px 10px 28px" }}>
                    {openSubs.length === 0 ? (
                      <div style={{
                        fontSize: "11px", color: "#3A3A3E", fontStyle: "italic",
                        fontFamily: "'DM Sans', sans-serif", padding: "4px 0",
                      }}>No outstanding subtasks.</div>
                    ) : (
                      openSubs.map(s => {
                        const overdue = s.dueDate && new Date(s.dueDate + "T23:59:59").getTime() < Date.now();
                        const dueSoon = !overdue && s.dueDate && new Date(s.dueDate + "T23:59:59").getTime() - Date.now() < TWO_DAYS;
                        return (
                          <div key={s.id} style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "3px 0", fontSize: "11px",
                            fontFamily: "'DM Sans', sans-serif",
                          }}>
                            <span style={{
                              fontFamily: "'JetBrains Mono', monospace", fontSize: "9px",
                              color: "#6E6E73", minWidth: "44px",
                            }}>{s.id}</span>
                            <span style={{ color: "#C5C5CA", flex: 1 }}>{s.title}</span>
                            {s.dueDate && (
                              <span style={{
                                fontFamily: "'JetBrains Mono', monospace", fontSize: "9px",
                                color: overdue ? "#E85B5B" : dueSoon ? "#E8A838" : "#6E6E73",
                                flexShrink: 0,
                              }}>
                                {overdue ? "⚠ " : dueSoon ? "⏰ " : ""}{fmtSubDue(s.dueDate)}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
