// ── Pure mutation functions ────────────────────────────────────────
//
// Single source of truth for tracker-data changes. Both manual UI
// handlers and the agent's action dispatcher call into these so any
// invariants (e.g. parent task auto-status) stay consistent.
//
// All functions are pure — they take the previous data object and
// return a new one. Never mutate inputs in place.

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

// ── Invariants ─────────────────────────────────────────────────────

// Status auto-rules:
//   * All subtasks done           → parent → DONE
//   * Any subtask open & parent DONE → parent → IN PROGRESS
//   * No subtasks                 → leave parent alone
export function normalizeTaskStatus(task) {
  const subs = task.subtasks || [];
  if (subs.length === 0) return task;
  const allDone = subs.every(s => s.done);
  const anyOpen = subs.some(s => !s.done);
  if (allDone && task.status !== "DONE") return { ...task, status: "DONE" };
  if (anyOpen && task.status === "DONE") return { ...task, status: "IN PROGRESS" };
  return task;
}

// Apply a per-task transform across all workstreams, normalizing afterwards.
function mapTask(data, taskId, transform) {
  return {
    ...data,
    workstreams: data.workstreams.map(ws => ({
      ...ws,
      tasks: ws.tasks.map(t => (t.id === taskId ? normalizeTaskStatus(transform(t)) : t)),
    })),
  };
}

// ── Tasks ──────────────────────────────────────────────────────────

export function addTask(data, workstreamId, task) {
  return {
    ...data,
    workstreams: data.workstreams.map(ws =>
      ws.id === workstreamId ? { ...ws, tasks: [...ws.tasks, normalizeTaskStatus(task)] } : ws
    ),
  };
}

export function updateTask(data, taskId, updates) {
  return mapTask(data, taskId, t => ({ ...t, ...updates }));
}

export function deleteTask(data, taskId) {
  return {
    ...data,
    workstreams: data.workstreams.map(ws => ({ ...ws, tasks: ws.tasks.filter(t => t.id !== taskId) })),
    todayPlan: data.todayPlan
      ? { ...data.todayPlan, taskIds: (data.todayPlan.taskIds || []).filter(id => id !== taskId) }
      : data.todayPlan,
  };
}

// ── Subtasks ───────────────────────────────────────────────────────

export function addSubtask(data, taskId, title, opts = {}) {
  return mapTask(data, taskId, t => {
    const existing = t.subtasks || [];
    const suffix = String.fromCharCode(97 + existing.length);
    const newSub = {
      id: `${t.id}${suffix}`,
      title,
      done: false,
      completedAt: null,
      ...(opts.dueDate ? { dueDate: opts.dueDate } : {}),
    };
    return { ...t, subtasks: [...existing, newSub] };
  });
}

export function toggleSubtask(data, taskId, subtaskId) {
  return mapTask(data, taskId, t => {
    const subtasks = (t.subtasks || []).map(s =>
      s.id === subtaskId
        ? { ...s, done: !s.done, completedAt: !s.done ? nowIso() : null }
        : s
    );
    return { ...t, subtasks };
  });
}

export function deleteSubtask(data, taskId, subtaskId) {
  return mapTask(data, taskId, t => ({
    ...t,
    subtasks: (t.subtasks || []).filter(s => s.id !== subtaskId),
  }));
}

export function updateSubtask(data, taskId, subtaskId, updates) {
  return mapTask(data, taskId, t => ({
    ...t,
    subtasks: (t.subtasks || []).map(s => (s.id === subtaskId ? { ...s, ...updates } : s)),
  }));
}

// ── Documents ──────────────────────────────────────────────────────

export function addDocument(data, taskId, doc) {
  return mapTask(data, taskId, t => ({ ...t, documents: [...(t.documents || []), doc] }));
}

export function updateDocument(data, taskId, docId, updates) {
  return mapTask(data, taskId, t => ({
    ...t,
    documents: (t.documents || []).map(d => (d.id === docId ? { ...d, ...updates } : d)),
  }));
}

export function deleteDocument(data, taskId, docId) {
  return mapTask(data, taskId, t => ({
    ...t,
    documents: (t.documents || []).filter(d => d.id !== docId),
  }));
}

// ── Notes ──────────────────────────────────────────────────────────

export function addNote(data, text) {
  return { ...data, notes: [{ text, ts: nowIso() }, ...(data.notes || [])] };
}

export function deleteNote(data, idx) {
  return { ...data, notes: (data.notes || []).filter((_, i) => i !== idx) };
}

// ── Workstreams ────────────────────────────────────────────────────

export function addWorkstream(data, ws) {
  if (!ws?.id || !ws?.name || !ws?.prefix || !ws?.color) return data;
  if (data.workstreams.some(w => w.id === ws.id)) return data;
  return { ...data, workstreams: [...data.workstreams, { ...ws, tasks: ws.tasks || [] }] };
}

export function updateWorkstream(data, wsId, updates) {
  return {
    ...data,
    workstreams: data.workstreams.map(w => {
      if (w.id !== wsId) return w;
      const { id: _ignored, ...safe } = updates || {};
      return { ...w, ...safe };
    }),
  };
}

export function deleteWorkstream(data, wsId) {
  return { ...data, workstreams: data.workstreams.filter(w => w.id !== wsId) };
}

export function reorderWorkstreams(data, order) {
  if (!Array.isArray(order)) return data;
  const byId = Object.fromEntries(data.workstreams.map(w => [w.id, w]));
  const reordered = order.filter(id => byId[id]).map(id => byId[id]);
  const remaining = data.workstreams.filter(w => !order.includes(w.id));
  return { ...data, workstreams: [...reordered, ...remaining] };
}

// ── Week shape ─────────────────────────────────────────────────────

export function updateDay(data, index, updates) {
  return { ...data, weekShape: data.weekShape.map((d, i) => (i === index ? { ...d, ...updates } : d)) };
}

export function addDay(data, day = { day: "New Day", focus: "TBD", activities: "" }) {
  return { ...data, weekShape: [...data.weekShape, day] };
}

export function removeDay(data, index) {
  return { ...data, weekShape: data.weekShape.filter((_, i) => i !== index) };
}

// ── Now pin (the one task you're actively working on) ─────────────

export function setNowPin(data, taskId) {
  return { ...data, nowPinTaskId: taskId || null };
}

export function clearNowPin(data) {
  return { ...data, nowPinTaskId: null };
}

// ── Weekly retros ──────────────────────────────────────────────────

// weekKey is the ISO date of the Monday of that week, e.g. "2026-04-20".
export function setWeeklyRetro(data, weekKey, retro) {
  if (!weekKey || !retro) return data;
  return {
    ...data,
    weeklyRetros: {
      ...(data.weeklyRetros || {}),
      [weekKey]: {
        ...(retro || {}),
        generatedAt: retro.generatedAt || nowIso(),
      },
    },
  };
}

// ── Today plan ─────────────────────────────────────────────────────

// Preserves any unrelated fields (autoTriaged, log) when the agent
// rewrites the plan via set_today_plan.
export function setTodayPlan(data, taskIds, userNote) {
  const prev = data.todayPlan || {};
  return {
    ...data,
    todayPlan: {
      ...prev,
      date: todayStr(),
      taskIds: Array.isArray(taskIds) ? taskIds : [],
      userNote: userNote ?? prev.userNote ?? "",
      log: prev.log || "",
      autoTriaged: true,
    },
  };
}

export function setTodayLog(data, log) {
  return { ...data, todayPlan: { ...(data.todayPlan || {}), log } };
}

export function updateTodayPlan(data, updates) {
  return { ...data, todayPlan: { ...(data.todayPlan || {}), ...updates } };
}

export function addToToday(data, taskId) {
  const plan = data.todayPlan || { date: todayStr(), taskIds: [], userNote: "", log: "" };
  if (plan.taskIds.includes(taskId)) return data;
  return { ...data, todayPlan: { ...plan, taskIds: [...plan.taskIds, taskId] } };
}

export function removeFromToday(data, taskId) {
  return {
    ...data,
    todayPlan: { ...(data.todayPlan || {}), taskIds: (data.todayPlan?.taskIds || []).filter(id => id !== taskId) },
  };
}

export function reorderToday(data, fromIdx, toIdx) {
  const ids = [...(data.todayPlan?.taskIds || [])];
  const [moved] = ids.splice(fromIdx, 1);
  ids.splice(toIdx, 0, moved);
  return { ...data, todayPlan: { ...(data.todayPlan || {}), taskIds: ids } };
}

// ── Context doc helpers ────────────────────────────────────────────
//
// The context doc is a markdown string. Sections are denoted by
// "## Section Name" headers. updateContextSection appends to a
// named section (creating it if missing); appendContextNote falls
// back to a dated dump for backward compat.

export function appendContextNote(prevDoc, text) {
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (prevDoc || "").trimEnd() + `\n\n## Agent-Learned Notes (${date})\n${text}`;
}

export function updateContextSection(prevDoc, section, text, mode = "append") {
  const doc = prevDoc || "";
  const heading = `## ${section}`;
  // Find the start of the heading line
  const lines = doc.split("\n");
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase() === heading.toLowerCase()) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) {
    // Section doesn't exist — create it at the end.
    return doc.trimEnd() + `\n\n${heading}\n${text}\n`;
  }
  // Find end of section: next "## " heading or EOF
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  const sectionLines = lines.slice(startIdx, endIdx);
  let newSection;
  if (mode === "replace") {
    newSection = [heading, text.trimEnd(), ""];
  } else {
    // append
    const trimmedExisting = sectionLines.join("\n").replace(/\s+$/, "");
    newSection = [trimmedExisting, "", text.trimEnd(), ""];
  }
  return [
    ...lines.slice(0, startIdx),
    ...newSection.join("\n").split("\n"),
    ...lines.slice(endIdx),
  ].join("\n").replace(/\n{3,}/g, "\n\n");
}

// ── Agent action dispatcher ────────────────────────────────────────
//
// Applies a single agent action to data. Returns the next data
// object. Context-doc updates are returned via the side-channel
// callback because they live outside the tracker state.
//
// Unknown / malformed actions return the data unchanged.

export function applyAgentAction(data, action, ctx = {}) {
  const { onContextUpdate } = ctx;
  switch (action.type) {
    case "add_task":
      if (action.workstream_id && action.task) return addTask(data, action.workstream_id, action.task);
      return data;
    case "update_task":
      if (action.task_id && action.updates) return updateTask(data, action.task_id, action.updates);
      return data;
    case "delete_task":
      if (action.task_id) return deleteTask(data, action.task_id);
      return data;
    case "add_subtask":
      if (action.task_id && action.title) {
        return addSubtask(data, action.task_id, action.title, { dueDate: action.dueDate });
      }
      return data;
    case "toggle_subtask":
      if (action.task_id && action.subtask_id) return toggleSubtask(data, action.task_id, action.subtask_id);
      return data;
    case "delete_subtask":
      if (action.task_id && action.subtask_id) return deleteSubtask(data, action.task_id, action.subtask_id);
      return data;
    case "update_subtask":
      if (action.task_id && action.subtask_id && action.updates) {
        return updateSubtask(data, action.task_id, action.subtask_id, action.updates);
      }
      return data;
    case "add_document":
      if (action.task_id && action.document) return addDocument(data, action.task_id, action.document);
      return data;
    case "update_document":
      if (action.task_id && action.document_id && action.updates) {
        return updateDocument(data, action.task_id, action.document_id, action.updates);
      }
      return data;
    case "delete_document":
      if (action.task_id && action.document_id) return deleteDocument(data, action.task_id, action.document_id);
      return data;
    case "add_note":
      if (action.text) return addNote(data, action.text);
      return data;
    case "add_workstream":
      if (action.workstream) return addWorkstream(data, action.workstream);
      return data;
    case "update_workstream":
      if (action.workstream_id && action.updates) return updateWorkstream(data, action.workstream_id, action.updates);
      return data;
    case "delete_workstream":
      if (action.workstream_id) return deleteWorkstream(data, action.workstream_id);
      return data;
    case "reorder_workstreams":
      if (Array.isArray(action.order)) return reorderWorkstreams(data, action.order);
      return data;
    case "set_today_plan":
      if (Array.isArray(action.taskIds)) return setTodayPlan(data, action.taskIds, action.userNote);
      return data;
    case "set_today_log":
      if (typeof action.log === "string") return setTodayLog(data, action.log);
      return data;
    case "update_context":
      // Backward compat — appends a dated note.
      if (action.text && onContextUpdate) onContextUpdate(prev => appendContextNote(prev, action.text));
      return data;
    case "update_context_section":
      if (action.section && action.text && onContextUpdate) {
        const mode = action.mode === "replace" ? "replace" : "append";
        onContextUpdate(prev => updateContextSection(prev, action.section, action.text, mode));
      }
      return data;
    case "set_now_pin":
      if (action.task_id) return setNowPin(data, action.task_id);
      return data;
    case "clear_now_pin":
      return clearNowPin(data);
    case "set_weekly_retro":
      if (action.weekKey && action.retro) return setWeeklyRetro(data, action.weekKey, action.retro);
      return data;
    case "draft_tomorrow_plan":
      // Stash an agent-drafted plan for tomorrow without applying it.
      // The user reviews it from TodayView's end-of-day flow.
      if (Array.isArray(action.taskIds)) {
        return {
          ...data,
          tomorrowDraft: {
            taskIds: action.taskIds,
            userNote: action.userNote || "",
            draftedAt: nowIso(),
          },
        };
      }
      return data;
    default:
      return data;
  }
}

// Apply a list of actions in order.
export function applyAgentActions(data, actions, ctx = {}) {
  let next = data;
  for (const action of actions || []) {
    next = applyAgentAction(next, action, ctx);
  }
  return next;
}
