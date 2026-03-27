import { useState, useEffect, useCallback, useRef } from "react";
import { DEFAULT_DATA, STORAGE_KEY, CONTEXT_KEY, AGENT_HISTORY_KEY } from "./lib/constants.js";
import { loadData, saveData, loadContext, saveContext, getTimestamp, loadArchiveIndex, saveArchiveIndex, saveArchive, loadArchive } from "./lib/storage.js";
import { onAuthStateChange } from "./lib/auth.js";
import DEFAULT_CONTEXT from "./context/default-context.md?raw";
import { useIsMobile } from "./hooks/useMediaQuery.js";
import Header from "./components/Header.jsx";
import StatsBar from "./components/StatsBar.jsx";
import Workstream from "./components/Workstream.jsx";
import WeekShape from "./components/WeekShape.jsx";
import QuickNotes from "./components/QuickNotes.jsx";
import ContextEditor from "./components/ContextEditor.jsx";
import AgentPanel from "./components/AgentPanel.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import { generateWeeklySummary } from "./lib/export.js";

// Compute the current week label: "Week of March 24-28"
function getCurrentWeekLabel() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : -(dayOfWeek - 1);
  const monday = new Date(now);
  monday.setDate(monday.getDate() + diff);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `Week of ${monthNames[monday.getMonth()]} ${monday.getDate()}-${friday.getDate()}`;
}

// Backfill completedAt on done subtasks that are missing it (legacy data).
// Returns the data (mutated in place) and whether any backfills were made.
function backfillCompletedAt(d) {
  let changed = false;
  for (const ws of d.workstreams || []) {
    for (const t of ws.tasks || []) {
      for (const s of t.subtasks || []) {
        if (s.done && !s.completedAt) {
          s.completedAt = new Date().toISOString();
          changed = true;
        }
      }
    }
  }
  return changed;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("tasks");
  const [filter, setFilter] = useState("all");
  const [agentOpen, setAgentOpen] = useState(false);
  const [contextDoc, setContextDoc] = useState(DEFAULT_CONTEXT);
  const [syncToast, setSyncToast] = useState(false);
  const [agentRefreshKey, setAgentRefreshKey] = useState(0);
  const [exportToast, setExportToast] = useState(false);
  const [viewingArchive, setViewingArchive] = useState(null);
  const [archiveIndex, setArchiveIndex] = useState([]);
  const [archiveData, setArchiveData] = useState(null);

  const [offline, setOffline] = useState(!navigator.onLine);

  const dataRef = useRef(null);
  const contextDocRef = useRef(contextDoc);
  const syncTimestamps = useRef({});
  const undoBuffer = useRef([]);
  const undoEpoch = useRef(0);
  const mobile = useIsMobile();

  // ── Online/offline detection ─────────────────────────────────────
  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { contextDocRef.current = contextDoc; }, [contextDoc]);

  // ── Auth ────────────────────────────────────────────────────────
  useEffect(() => {
    const subscription = onAuthStateChange((s) => {
      setSession(s);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Initial data load with timestamps ───────────────────────────
  const isAuthenticated = !!session;
  useEffect(() => {
    if (!isAuthenticated) {
      setData(null);
      setLoading(true);
      syncTimestamps.current = {};
      return;
    }
    setLoading(true);
    Promise.all([
      loadData(),
      loadContext(),
      getTimestamp(STORAGE_KEY),
      getTimestamp(CONTEXT_KEY),
      getTimestamp(AGENT_HISTORY_KEY),
      loadArchiveIndex(),
    ]).then(async ([saved, ctx, dataTs, ctxTs, histTs, idx]) => {
      const d = saved || DEFAULT_DATA;
      let needsSave = backfillCompletedAt(d);
      const currentLabel = getCurrentWeekLabel();
      if (d.weekLabel !== currentLabel) {
        d.weekLabel = currentLabel;
        needsSave = true;
      }
      setData(d);
      dataRef.current = d;
      setContextDoc(ctx || DEFAULT_CONTEXT);
      setArchiveIndex(idx || []);
      syncTimestamps.current = {
        [STORAGE_KEY]: dataTs,
        [CONTEXT_KEY]: ctxTs,
        [AGENT_HISTORY_KEY]: histTs,
      };
      if (needsSave) {
        const ts = await saveData(d);
        if (ts) syncTimestamps.current[STORAGE_KEY] = ts;
      }
      setLoading(false);
    });
  }, [isAuthenticated]);

  // ── Sync-before-write ───────────────────────────────────────────
  // Accepts a mutation function: (currentData) => newData
  // Optimistic update first, then checks for remote conflicts.
  const persist = useCallback(async (mutate) => {
    const optimistic = mutate(dataRef.current);
    dataRef.current = optimistic;
    setData(optimistic);

    try {
      const remoteTs = await getTimestamp(STORAGE_KEY);
      const localTs = syncTimestamps.current[STORAGE_KEY];
      const isStale = remoteTs && (!localTs || new Date(remoteTs) > new Date(localTs));

      if (isStale) {
        const fresh = await loadData() || DEFAULT_DATA;
        const merged = mutate(fresh);
        dataRef.current = merged;
        setData(merged);
        setSyncToast(true);
        const ts = await saveData(merged);
        if (ts) syncTimestamps.current[STORAGE_KEY] = ts;
      } else {
        const ts = await saveData(optimistic);
        if (ts) syncTimestamps.current[STORAGE_KEY] = ts;
      }
    } catch (e) {
      console.error("Sync-before-write failed:", e);
      const ts = await saveData(optimistic);
      if (ts) syncTimestamps.current[STORAGE_KEY] = ts;
    }
  }, []);

  // ── Background refresh (focus / visibility) ─────────────────────
  const refreshData = useCallback(async () => {
    if (!dataRef.current) return;
    try {
      const [dataTs, ctxTs, histTs] = await Promise.all([
        getTimestamp(STORAGE_KEY),
        getTimestamp(CONTEXT_KEY),
        getTimestamp(AGENT_HISTORY_KEY),
      ]);

      const dataStale = dataTs && (!syncTimestamps.current[STORAGE_KEY] || new Date(dataTs) > new Date(syncTimestamps.current[STORAGE_KEY]));
      const ctxStale = ctxTs && (!syncTimestamps.current[CONTEXT_KEY] || new Date(ctxTs) > new Date(syncTimestamps.current[CONTEXT_KEY]));
      const histStale = histTs && (!syncTimestamps.current[AGENT_HISTORY_KEY] || new Date(histTs) > new Date(syncTimestamps.current[AGENT_HISTORY_KEY]));

      if (!dataStale && !ctxStale && !histStale) return;

      const promises = [];

      if (dataStale) {
        promises.push(loadData().then(async (saved) => {
          if (saved) {
            const didBackfill = backfillCompletedAt(saved);
            setData(saved);
            dataRef.current = saved;
            if (didBackfill) {
              const ts = await saveData(saved);
              if (ts) { syncTimestamps.current[STORAGE_KEY] = ts; return; }
            }
          }
          syncTimestamps.current[STORAGE_KEY] = dataTs;
        }));
      }

      if (ctxStale) {
        promises.push(loadContext().then(ctx => {
          if (ctx != null) setContextDoc(ctx);
          syncTimestamps.current[CONTEXT_KEY] = ctxTs;
        }));
      }

      if (histStale) {
        syncTimestamps.current[AGENT_HISTORY_KEY] = histTs;
        setAgentRefreshKey(k => k + 1);
      }

      await Promise.all(promises);
      setSyncToast(true);
    } catch (e) {
      console.error("Background refresh failed:", e);
    }
  }, []);

  // Focus / visibility listeners (debounced 300ms)
  useEffect(() => {
    if (!isAuthenticated) return;
    let timeout;
    const debouncedRefresh = () => {
      clearTimeout(timeout);
      timeout = setTimeout(refreshData, 300);
    };
    const handleFocus = () => debouncedRefresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") debouncedRefresh();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isAuthenticated, refreshData]);

  // Auto-hide sync toast after 2s
  useEffect(() => {
    if (!syncToast) return;
    const t = setTimeout(() => setSyncToast(false), 2000);
    return () => clearTimeout(t);
  }, [syncToast]);

  // Auto-hide export toast after 2s
  useEffect(() => {
    if (!exportToast) return;
    const t = setTimeout(() => setExportToast(false), 2000);
    return () => clearTimeout(t);
  }, [exportToast]);

  // ── Cmd+K to toggle agent panel ────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setAgentOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Handlers ────────────────────────────────────────────────────

  const handleStatusChange = (taskId, newStatus) => {
    undoEpoch.current++;
    persist(d => ({ ...d, workstreams: d.workstreams.map(ws => ({ ...ws, tasks: ws.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t) })) }));
  };
  const handleEdit = (taskId, updates) => {
    undoEpoch.current++;
    persist(d => ({ ...d, workstreams: d.workstreams.map(ws => ({ ...ws, tasks: ws.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) })) }));
  };
  const handleDelete = (taskId) => {
    undoEpoch.current++;
    persist(d => ({ ...d, workstreams: d.workstreams.map(ws => ({ ...ws, tasks: ws.tasks.filter(t => t.id !== taskId) })) }));
  };
  const handleAddTask = (wsId, task) => {
    undoEpoch.current++;
    persist(d => ({ ...d, workstreams: d.workstreams.map(ws => ws.id === wsId ? { ...ws, tasks: [...ws.tasks, task] } : ws) }));
  };
  const handleToggleSubtask = (taskId, subtaskId) => {
    undoEpoch.current++;
    persist(d => ({
      ...d,
      workstreams: d.workstreams.map(ws => ({
        ...ws,
        tasks: ws.tasks.map(t => {
          if (t.id !== taskId) return t;
          const subtasks = (t.subtasks || []).map(s =>
            s.id === subtaskId ? { ...s, done: !s.done, completedAt: !s.done ? new Date().toISOString() : null } : s
          );
          const allDone = subtasks.length > 0 && subtasks.every(s => s.done);
          return { ...t, subtasks, ...(allDone ? { status: "DONE" } : {}) };
        }),
      })),
    }));
  };
  const handleAddSubtask = (taskId, title) => {
    undoEpoch.current++;
    persist(d => ({
      ...d,
      workstreams: d.workstreams.map(ws => ({
        ...ws,
        tasks: ws.tasks.map(t => {
          if (t.id !== taskId) return t;
          const existing = t.subtasks || [];
          const suffix = String.fromCharCode(97 + existing.length); // a, b, c...
          return { ...t, subtasks: [...existing, { id: `${taskId}${suffix}`, title, done: false, completedAt: null }] };
        }),
      })),
    }));
  };
  const handleDeleteSubtask = (taskId, subtaskId) => {
    undoEpoch.current++;
    persist(d => ({
      ...d,
      workstreams: d.workstreams.map(ws => ({
        ...ws,
        tasks: ws.tasks.map(t =>
          t.id !== taskId ? t : { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== subtaskId) }
        ),
      })),
    }));
  };
  const handleAddNote = (note) => {
    undoEpoch.current++;
    persist(d => ({ ...d, notes: [note, ...d.notes] }));
  };
  const handleDeleteNote = (idx) => {
    undoEpoch.current++;
    persist(d => ({ ...d, notes: d.notes.filter((_, i) => i !== idx) }));
  };
  const handleReset = () => {
    undoEpoch.current++;
    if (confirm("Reset all data to defaults? This cannot be undone.")) persist(() => DEFAULT_DATA);
  };
  const handleUpdateDay = (index, updates) => {
    undoEpoch.current++;
    persist(d => ({
      ...d,
      weekShape: d.weekShape.map((day, i) => i === index ? { ...day, ...updates } : day)
    }));
  };
  const handleAddDay = () => {
    undoEpoch.current++;
    persist(d => ({
      ...d,
      weekShape: [...d.weekShape, { day: "New Day", focus: "TBD", activities: "" }]
    }));
  };
  const handleRemoveDay = (index) => {
    undoEpoch.current++;
    persist(d => ({
      ...d,
      weekShape: d.weekShape.filter((_, i) => i !== index)
    }));
  };
  const handleContextSave = async (text) => {
    setContextDoc(text);
    const ts = await saveContext(text);
    if (ts) syncTimestamps.current[CONTEXT_KEY] = ts;
  };

  const handleNewWeek = async () => {
    if (!confirm("Start a new week? Current data will be archived. Completed tasks will be removed and in-progress tasks reset to NOT STARTED.")) return;

    const current = dataRef.current;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const archiveKey = `work-tracker-archive-${dateStr}`;

    // Archive current data
    const archive = JSON.parse(JSON.stringify(current));
    archive.archivedAt = now.toISOString();
    await saveArchive(archiveKey, archive);

    // Update archive index
    const index = await loadArchiveIndex();
    if (!index.find(e => e.key === archiveKey)) {
      index.push({ key: archiveKey, weekLabel: current.weekLabel, archivedAt: now.toISOString() });
      await saveArchiveIndex(index);
    }
    setArchiveIndex(index);

    const weekLabel = getCurrentWeekLabel();

    // Build new week data
    undoEpoch.current++;
    persist(d => ({
      ...d,
      weekLabel,
      workstreams: d.workstreams.map(ws => ({
        ...ws,
        tasks: ws.tasks
          .filter(t => t.status !== "DONE")
          .map(t => t.status === "IN PROGRESS" ? { ...t, status: "NOT STARTED" } : t),
      })),
      weekShape: d.weekShape.map(day => ({ ...day, focus: "TBD", activities: "" })),
      notes: [],
    }));
  };

  const handleExport = () => {
    const target = viewingArchive && archiveData ? archiveData : dataRef.current;
    const md = generateWeeklySummary(target);

    // Copy to clipboard
    navigator.clipboard.writeText(md).then(() => setExportToast(true)).catch(() => {});

    // Download as .md file
    const slug = (target.weekLabel || "export").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workplan-${slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNavigateWeek = useCallback(async (direction) => {
    if (archiveIndex.length === 0) return;
    if (!viewingArchive) {
      // Currently on current week, go to newest archive
      if (direction === -1) {
        const entry = archiveIndex[archiveIndex.length - 1];
        const archived = await loadArchive(entry.key);
        if (archived) { setArchiveData(archived); setViewingArchive(entry.key); }
      }
      return;
    }
    const currentIdx = archiveIndex.findIndex(e => e.key === viewingArchive);
    const nextIdx = currentIdx + direction;
    if (nextIdx < 0) return; // at oldest, can't go further back
    if (nextIdx >= archiveIndex.length) {
      // Go back to current week
      setViewingArchive(null); setArchiveData(null);
      return;
    }
    const entry = archiveIndex[nextIdx];
    const archived = await loadArchive(entry.key);
    if (archived) { setArchiveData(archived); setViewingArchive(entry.key); }
  }, [viewingArchive, archiveIndex]);

  const handleJumpToWeek = useCallback(async (archiveKey) => {
    if (!archiveKey) {
      setViewingArchive(null); setArchiveData(null);
      return;
    }
    const archived = await loadArchive(archiveKey);
    if (archived) { setArchiveData(archived); setViewingArchive(archiveKey); }
  }, []);

  const handleAgentActions = useCallback((actions, messageIndex) => {
    const snapshot = JSON.parse(JSON.stringify(dataRef.current));
    undoBuffer.current = [
      ...undoBuffer.current.slice(-4),
      { snapshot, messageIndex, ts: Date.now(), epoch: undoEpoch.current }
    ];

    persist(prev => {
      let d = JSON.parse(JSON.stringify(prev));
      for (const action of actions) {
        if (action.type === "add_task" && action.workstream_id && action.task) {
          const ws = d.workstreams.find(w => w.id === action.workstream_id);
          if (ws) ws.tasks.push(action.task);
        }
        if (action.type === "update_task" && action.task_id && action.updates) {
          for (const ws of d.workstreams) {
            ws.tasks = ws.tasks.map(t => t.id === action.task_id ? { ...t, ...action.updates } : t);
          }
        }
        if (action.type === "delete_task" && action.task_id) {
          for (const ws of d.workstreams) {
            ws.tasks = ws.tasks.filter(t => t.id !== action.task_id);
          }
        }
        if (action.type === "add_note" && action.text) {
          d.notes = [{ text: action.text, ts: new Date().toISOString() }, ...d.notes];
        }
        if (action.type === "add_subtask" && action.task_id && action.title) {
          for (const ws of d.workstreams) {
            ws.tasks = ws.tasks.map(t => {
              if (t.id !== action.task_id) return t;
              const existing = t.subtasks || [];
              const suffix = String.fromCharCode(97 + existing.length);
              return { ...t, subtasks: [...existing, { id: `${t.id}${suffix}`, title: action.title, done: false, completedAt: null }] };
            });
          }
        }
        if (action.type === "toggle_subtask" && action.task_id && action.subtask_id) {
          for (const ws of d.workstreams) {
            ws.tasks = ws.tasks.map(t => {
              if (t.id !== action.task_id) return t;
              const subtasks = (t.subtasks || []).map(s =>
                s.id === action.subtask_id ? { ...s, done: !s.done, completedAt: !s.done ? new Date().toISOString() : null } : s
              );
              const allDone = subtasks.length > 0 && subtasks.every(s => s.done);
              return { ...t, subtasks, ...(allDone ? { status: "DONE" } : {}) };
            });
          }
        }
        if (action.type === "delete_subtask" && action.task_id && action.subtask_id) {
          for (const ws of d.workstreams) {
            ws.tasks = ws.tasks.map(t =>
              t.id !== action.task_id ? t : { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== action.subtask_id) }
            );
          }
        }
        if (action.type === "update_subtask" && action.task_id && action.subtask_id && action.updates) {
          for (const ws of d.workstreams) {
            ws.tasks = ws.tasks.map(t => {
              if (t.id !== action.task_id) return t;
              return { ...t, subtasks: (t.subtasks || []).map(s => s.id === action.subtask_id ? { ...s, ...action.updates } : s) };
            });
          }
        }
        if (action.type === "add_document" && action.task_id && action.document) {
          for (const ws of d.workstreams) {
            ws.tasks = ws.tasks.map(t => {
              if (t.id !== action.task_id) return t;
              return { ...t, documents: [...(t.documents || []), action.document] };
            });
          }
        }
        if (action.type === "delete_document" && action.task_id && action.document_id) {
          for (const ws of d.workstreams) {
            ws.tasks = ws.tasks.map(t => {
              if (t.id !== action.task_id) return t;
              return { ...t, documents: (t.documents || []).filter(doc => doc.id !== action.document_id) };
            });
          }
        }
        if (action.type === "update_document" && action.task_id && action.document_id && action.updates) {
          for (const ws of d.workstreams) {
            ws.tasks = ws.tasks.map(t => {
              if (t.id !== action.task_id) return t;
              return { ...t, documents: (t.documents || []).map(doc => doc.id === action.document_id ? { ...doc, ...action.updates } : doc) };
            });
          }
        }
        if (action.type === "add_workstream" && action.workstream && action.workstream.id && action.workstream.name && action.workstream.prefix && action.workstream.color) {
          if (!d.workstreams.find(w => w.id === action.workstream.id)) {
            d.workstreams.push({ ...action.workstream, tasks: action.workstream.tasks || [] });
          }
        }
        if (action.type === "update_workstream" && action.workstream_id && action.updates) {
          d.workstreams = d.workstreams.map(w => {
            if (w.id !== action.workstream_id) return w;
            const { id, ...safeUpdates } = action.updates;
            return { ...w, ...safeUpdates };
          });
        }
        if (action.type === "delete_workstream" && action.workstream_id) {
          d.workstreams = d.workstreams.filter(w => w.id !== action.workstream_id);
        }
        if (action.type === "reorder_workstreams" && Array.isArray(action.order)) {
          const byId = Object.fromEntries(d.workstreams.map(w => [w.id, w]));
          const reordered = action.order.filter(id => byId[id]).map(id => byId[id]);
          const remaining = d.workstreams.filter(w => !action.order.includes(w.id));
          d.workstreams = [...reordered, ...remaining];
        }
        if (action.type === "update_context" && action.text) {
          const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const current = contextDocRef.current || "";
          const updated = current.trimEnd() + `\n\n## Agent-Learned Notes (${date})\n${action.text}`;
          setContextDoc(updated);
          contextDocRef.current = updated;
          saveContext(updated).then(ts => { if (ts) syncTimestamps.current[CONTEXT_KEY] = ts; });
        }
      }
      return d;
    });
  }, [persist]);

  const handleUndo = useCallback((messageIndex) => {
    const entry = undoBuffer.current.find(e => e.messageIndex === messageIndex);
    if (!entry) return;
    persist(() => entry.snapshot);
    undoBuffer.current = undoBuffer.current.filter(e => e.messageIndex !== messageIndex);
  }, [persist]);

  const getUndoableMessages = useCallback(() => {
    const now = Date.now();
    const currentEpoch = undoEpoch.current;
    return new Set(
      undoBuffer.current
        .filter(e => e.epoch === currentEpoch && now - e.ts < 30000)
        .map(e => e.messageIndex)
    );
  }, []);

  const handleHistorySaved = useCallback((ts) => {
    if (ts) syncTimestamps.current[AGENT_HISTORY_KEY] = ts;
  }, []);

  // Pull fresh data + context from Supabase for the agent API call.
  // Updates local state and sync timestamps as a side-effect.
  const getFreshData = useCallback(async () => {
    const [freshData, freshCtx, dataTs, ctxTs] = await Promise.all([
      loadData(),
      loadContext(),
      getTimestamp(STORAGE_KEY),
      getTimestamp(CONTEXT_KEY),
    ]);
    const d = freshData || DEFAULT_DATA;
    const c = freshCtx ?? DEFAULT_CONTEXT;
    setData(d);
    dataRef.current = d;
    setContextDoc(c);
    if (dataTs) syncTimestamps.current[STORAGE_KEY] = dataTs;
    if (ctxTs) syncTimestamps.current[CONTEXT_KEY] = ctxTs;
    return { data: d, contextDoc: c };
  }, []);

  // ── Render ──────────────────────────────────────────────────────

  if (authLoading) {
    return <div style={{ minHeight: "100vh", background: "#0D0D0F", display: "flex", alignItems: "center", justifyContent: "center", color: "#6E6E73", fontFamily: "'Space Mono', monospace" }}>Loading...</div>;
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#0D0D0F", display: "flex", alignItems: "center", justifyContent: "center", color: "#6E6E73", fontFamily: "'Space Mono', monospace" }}>Loading...</div>;
  }

  const readOnly = !!viewingArchive || offline;
  const effectiveData = viewingArchive && archiveData ? archiveData : data;

  const filteredWorkstreams = effectiveData.workstreams.map(ws => ({
    ...ws,
    tasks: filter === "all" ? ws.tasks : filter === "active" ? ws.tasks.filter(t => t.status !== "DONE") : ws.tasks.filter(t => t.status === "DONE"),
  }));
  const visibleWorkstreams = filteredWorkstreams.filter(ws => ws.tasks.length > 0);
  // For empty filter states: workstreams that have tasks in the unfiltered data but none after filtering
  const emptyFilteredWorkstreams = filter !== "all" ? filteredWorkstreams.filter(ws => ws.tasks.length === 0 && effectiveData.workstreams.find(w => w.id === ws.id)?.tasks.length > 0) : [];

  return (
    <div style={{ minHeight: "100vh", background: "#0D0D0F", color: "#E5E5EA", fontFamily: "'DM Sans', sans-serif" }}>
      <Header data={effectiveData} view={view} setView={setView} filter={filter} setFilter={setFilter} onNewWeek={handleNewWeek} onExport={handleExport} onReset={handleReset} viewingArchive={viewingArchive} archiveIndex={archiveIndex} onNavigateWeek={handleNavigateWeek} onJumpToWeek={handleJumpToWeek} offline={offline} />

      <div style={{ padding: mobile ? "16px" : "24px 32px", maxWidth: "960px" }}>
        {view === "tasks" && (
          <>
            <StatsBar workstreams={effectiveData.workstreams} />
            {visibleWorkstreams.map(ws => (
              <Workstream key={ws.id} ws={ws} readOnly={readOnly} onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} onAddTask={handleAddTask} onToggleSubtask={handleToggleSubtask} onAddSubtask={handleAddSubtask} onDeleteSubtask={handleDeleteSubtask} />
            ))}
            {emptyFilteredWorkstreams.map(ws => (
              <Workstream key={ws.id} ws={ws} readOnly={readOnly} emptyFilterMessage="No tasks match this filter" onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} onAddTask={handleAddTask} onToggleSubtask={handleToggleSubtask} onAddSubtask={handleAddSubtask} onDeleteSubtask={handleDeleteSubtask} />
            ))}
            <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, #2A2A2E, transparent)", margin: "16px 0" }} />
            <div style={{ background: "#18181B", borderRadius: "10px", padding: "16px", border: "1px solid #2A2A2E" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Quick Notes</div>
              <QuickNotes notes={effectiveData.notes} readOnly={readOnly} onAdd={handleAddNote} onDelete={handleDeleteNote} />
            </div>
          </>
        )}
        {view === "week" && (
          <>
            <WeekShape weekShape={effectiveData.weekShape} workstreams={effectiveData.workstreams} readOnly={readOnly} onUpdateDay={handleUpdateDay} onAddDay={handleAddDay} onRemoveDay={handleRemoveDay} />
            <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, #2A2A2E, transparent)", margin: "8px 0" }} />
            <div style={{ marginTop: "16px", background: "#18181B", borderRadius: "10px", padding: "16px", border: "1px solid #2A2A2E" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Quick Notes</div>
              <QuickNotes notes={effectiveData.notes} readOnly={readOnly} onAdd={handleAddNote} onDelete={handleDeleteNote} />
            </div>
          </>
        )}
        {view === "context" && (
          <ContextEditor contextDoc={contextDoc} onSave={handleContextSave} />
        )}
      </div>

      {!readOnly && <AgentPanel onApplyActions={handleAgentActions} onUndo={handleUndo} getUndoableMessages={getUndoableMessages} isOpen={agentOpen} onToggle={() => setAgentOpen(!agentOpen)} refreshKey={agentRefreshKey} onHistorySaved={handleHistorySaved} getFreshData={getFreshData} />}

      {syncToast && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          background: "#1C1C1E", border: "1px solid #2A4A2A", borderRadius: "8px",
          padding: "8px 16px", color: "#6CC4A1", fontSize: "11px",
          fontFamily: "'JetBrains Mono', monospace", zIndex: 200,
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}>
          Synced latest changes
        </div>
      )}
      {exportToast && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          background: "#1C1C1E", border: "1px solid #2A2A4A", borderRadius: "8px",
          padding: "8px 16px", color: "#5B8DEF", fontSize: "11px",
          fontFamily: "'JetBrains Mono', monospace", zIndex: 200,
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}>
          Summary copied to clipboard
        </div>
      )}
    </div>
  );
}
