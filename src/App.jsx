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
import TodayView from "./components/TodayView.jsx";
import WeeklyRetro from "./components/WeeklyRetro.jsx";
import { callAgent } from "./lib/agent.js";
import { loadAgentHistory, saveAgentHistory } from "./lib/storage.js";
import { generateWeeklySummary } from "./lib/export.js";
import * as M from "./lib/mutations.js";

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
  const [view, setView] = useState("today");
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
      // Daily reset for today plan
      const todayStr = new Date().toISOString().slice(0, 10);
      if (!d.todayPlan || d.todayPlan.date !== todayStr) {
        // Snapshot previous day's plan into dailyLogs before resetting.
        // Capture per-task statuses too so the Week view can render
        // "what got done" for past days without rehydrating the full task.
        if (d.todayPlan && d.todayPlan.date) {
          if (!d.dailyLogs) d.dailyLogs = {};
          const taskStatusSnap = {};
          const taskTitleSnap = {};
          const allTasks = (d.workstreams || []).flatMap(w => w.tasks);
          for (const id of d.todayPlan.taskIds || []) {
            const t = allTasks.find(x => x.id === id);
            if (t) {
              taskStatusSnap[id] = t.status;
              taskTitleSnap[id] = t.title;
            }
          }
          d.dailyLogs[d.todayPlan.date] = {
            taskIds: d.todayPlan.taskIds || [],
            taskStatusSnap,
            taskTitleSnap,
            userNote: d.todayPlan.userNote || "",
            log: d.todayPlan.log || "",
          };
        }
        d.todayPlan = { date: todayStr, taskIds: [], userNote: "", log: "", autoTriaged: false };
        // Clear stale tomorrowDraft (it was for a prior day)
        d.tomorrowDraft = null;
        needsSave = true;
      }
      // Ensure log field exists on todayPlan (backfill)
      if (d.todayPlan && d.todayPlan.log === undefined) {
        d.todayPlan.log = "";
        needsSave = true;
      }
      // Backfill autoTriaged for legacy data
      if (d.todayPlan && d.todayPlan.autoTriaged === undefined) {
        // If the plan already has tasks, the user has clearly already engaged.
        d.todayPlan.autoTriaged = (d.todayPlan.taskIds || []).length > 0;
        needsSave = true;
      }
      // Ensure dailyLogs exists
      if (!d.dailyLogs) {
        d.dailyLogs = {};
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

  // ── Sunday auto-retro: once per session on Sun/Mon, draft last
  // week's retrospective in the background if it doesn't exist yet.
  const sundayAutoFiredRef = useRef(false);
  useEffect(() => {
    if (sundayAutoFiredRef.current) return;
    if (loading || !data) return;

    const today = new Date();
    const dow = today.getDay();
    if (dow !== 0 && dow !== 1) return;

    // Compute previous-week Monday key
    const todayIso = today.toISOString().slice(0, 10);
    const d = new Date(todayIso + "T12:00:00");
    const offset = d.getDay() === 0 ? -6 : 1 - d.getDay();
    d.setDate(d.getDate() + offset - 7);
    const prevWeekKey = d.toISOString().slice(0, 10);

    if (data.weeklyRetros?.[prevWeekKey]) return;

    // Session flag in sessionStorage so we only fire once per session per day
    const flagKey = `sunday-retro-fired:${prevWeekKey}`;
    if (sessionStorage.getItem(flagKey)) return;
    sessionStorage.setItem(flagKey, "1");
    sundayAutoFiredRef.current = true;

    handleTriageSubmit(
      `Background task: It's ${["Sunday", "Monday"][dow]} and last week's retro hasn't been generated. ` +
      `Generate a weekly retrospective for the week of ${prevWeekKey} (Monday). Review daily logs, completed tasks, ` +
      `and rollovers. Call set_weekly_retro with weekKey="${prevWeekKey}" and a structured retro: ` +
      `summary (2-3 sentences), wins (concrete completions with task ids), carryover (what's pushing into this week and why), ` +
      `decisions (notable choices), nextWeekFocus (one-line). Be specific.`
    ).catch(err => console.warn("Sunday auto-retro failed:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data?.weeklyRetros]);

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

  // Wrapper: every manual mutation bumps the undo epoch (invalidates
  // outstanding agent-undo buttons) and runs through persist().
  const mutate = useCallback((fn) => {
    undoEpoch.current++;
    persist(fn);
  }, [persist]);

  const handleStatusChange = (taskId, newStatus) => mutate(d => M.updateTask(d, taskId, { status: newStatus }));
  const handleEdit = (taskId, updates) => mutate(d => M.updateTask(d, taskId, updates));
  const handleDelete = (taskId) => mutate(d => M.deleteTask(d, taskId));
  const handleAddTask = (wsId, task) => mutate(d => M.addTask(d, wsId, task));
  const handleToggleSubtask = (taskId, subtaskId, opts = {}) => mutate(d => M.toggleSubtask(d, taskId, subtaskId, opts));
  const handleUpdateDailyLog = (date, updates) => mutate(d => ({
    ...d,
    dailyLogs: {
      ...(d.dailyLogs || {}),
      [date]: { ...(d.dailyLogs?.[date] || {}), ...updates },
    },
  }));
  const handleAddSubtask = (taskId, title) => mutate(d => M.addSubtask(d, taskId, title));
  const handleDeleteSubtask = (taskId, subtaskId) => mutate(d => M.deleteSubtask(d, taskId, subtaskId));
  const handleAddNote = (note) => mutate(d => ({ ...d, notes: [note, ...(d.notes || [])] }));
  const handleDeleteNote = (idx) => mutate(d => M.deleteNote(d, idx));
  const handleReset = () => {
    if (confirm("Reset all data to defaults? This cannot be undone.")) mutate(() => DEFAULT_DATA);
  };
  const handleUpdateDay = (index, updates) => mutate(d => M.updateDay(d, index, updates));
  const handleAddDay = () => mutate(d => M.addDay(d));
  const handleRemoveDay = (index) => mutate(d => M.removeDay(d, index));
  const handleContextSave = async (text) => {
    setContextDoc(text);
    const ts = await saveContext(text);
    if (ts) syncTimestamps.current[CONTEXT_KEY] = ts;
  };

  // ── Today plan handlers ─────────────────────────────────────────
  const handleUpdateTodayPlan = (updates) => mutate(d => M.updateTodayPlan(d, updates));
  const handleAddToToday = (taskId) => mutate(d => M.addToToday(d, taskId));
  const handleRemoveFromToday = (taskId) => mutate(d => M.removeFromToday(d, taskId));
  const handleReorderToday = (fromIdx, toIdx) => mutate(d => M.reorderToday(d, fromIdx, toIdx));

  // Now pin
  const handleSetNowPin = (taskId) => mutate(d => M.setNowPin(d, taskId));
  const handleClearNowPin = () => mutate(d => M.clearNowPin(d));

  // ── Morning intake ──────────────────────────────────────────────
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const intakeForToday = data?.morningIntake?.[todayDateStr] || null;
  const intakeActive = intakeForToday && (intakeForToday.status === "active" || intakeForToday.status === "reviewing");
  const agentMode = intakeActive ? "morning_intake" : "normal";

  const handleAcceptProposal = useCallback((proposalId) => {
    const date = new Date().toISOString().slice(0, 10);
    let nextContext = null;
    persist(prev => {
      const intake = prev.morningIntake?.[date];
      if (!intake) return prev;
      const proposal = intake.proposals.find(p => p.id === proposalId);
      if (!proposal) return prev;
      // Mark accepted then apply
      const decided = M.decideMorningProposal(prev, date, proposalId, "accepted");
      const acceptedProposal = decided.morningIntake[date].proposals.find(p => p.id === proposalId);
      return M.applyMorningProposal(decided, acceptedProposal, {
        onContextUpdate: (fn) => {
          nextContext = fn(nextContext != null ? nextContext : contextDocRef.current || "");
        },
      });
    });
    if (nextContext != null) {
      setContextDoc(nextContext);
      contextDocRef.current = nextContext;
      saveContext(nextContext).then(ts => { if (ts) syncTimestamps.current[CONTEXT_KEY] = ts; });
    }
  }, [persist]);

  const handleSkipProposal = useCallback((proposalId) => {
    const date = new Date().toISOString().slice(0, 10);
    persist(prev => M.decideMorningProposal(prev, date, proposalId, "skipped"));
  }, [persist]);

  const handleEditProposal = useCallback((proposalId, payloadUpdates) => {
    const date = new Date().toISOString().slice(0, 10);
    persist(prev => M.updateMorningProposal(prev, date, proposalId, payloadUpdates));
  }, [persist]);

  const handleFinishMorningIntake = useCallback(() => {
    const date = new Date().toISOString().slice(0, 10);
    persist(prev => M.completeMorningIntake(prev, date));
  }, [persist]);

  const handleSkipMorningIntake = useCallback(() => {
    const date = new Date().toISOString().slice(0, 10);
    persist(prev => M.skipMorningIntake(prev, date));
  }, [persist]);

  // Accept the agent-drafted tomorrow plan as today's plan (used when the
  // user opens the app the next morning and the previous evening's draft
  // is still sitting there).
  const handleAcceptTomorrowDraft = () => {
    mutate(d => {
      const draft = d.tomorrowDraft;
      if (!draft || !Array.isArray(draft.taskIds)) return d;
      const next = M.setTodayPlan(d, draft.taskIds, draft.userNote);
      return { ...next, tomorrowDraft: null };
    });
  };
  const handleDismissTomorrowDraft = () => mutate(d => ({ ...d, tomorrowDraft: null }));
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
      todayPlan: { date: new Date().toISOString().slice(0, 10), taskIds: [], userNote: "", log: "", autoTriaged: false },
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

    // Context-doc updates have to be flushed after persist() returns
    // so we batch them here and apply once.
    let nextContext = null;

    persist(prev => M.applyAgentActions(prev, actions, {
      onContextUpdate: (fn) => {
        nextContext = fn(nextContext != null ? nextContext : contextDocRef.current || "");
      },
    }));

    if (nextContext != null) {
      setContextDoc(nextContext);
      contextDocRef.current = nextContext;
      saveContext(nextContext).then(ts => { if (ts) syncTimestamps.current[CONTEXT_KEY] = ts; });
    }
  }, [persist]);

  const handleUndo = useCallback(async (messageIndex) => {
    const entry = undoBuffer.current.find(e => e.messageIndex === messageIndex);
    if (!entry) return;
    persist(() => entry.snapshot);
    undoBuffer.current = undoBuffer.current.filter(e => e.messageIndex !== messageIndex);

    // Tag the corresponding assistant message as undone so the agent
    // can see this feedback signal on its next turn.
    try {
      const history = await loadAgentHistory();
      const updated = history.map((m, i) =>
        m.role === "assistant" && i === messageIndex - 1
          ? { ...m, undone: true, undoneAt: new Date().toISOString() }
          : m
      );
      const ts = await saveAgentHistory(updated);
      if (ts) syncTimestamps.current[AGENT_HISTORY_KEY] = ts;
      setAgentRefreshKey(k => k + 1);
    } catch (e) {
      console.error("Failed to tag undone message:", e);
    }
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

  const handleTriageSubmit = async (input, opts = {}) => {
    const { hidden = false, mode } = opts;
    const [freshHistory, { data: freshData, contextDoc: freshCtx }] = await Promise.all([
      loadAgentHistory(),
      getFreshData(),
    ]);
    const userMsg = { role: "user", content: input, ...(hidden ? { meta: { hidden: true } } : {}) };
    const newMessages = [...freshHistory, userMsg];
    const modelKey = localStorage.getItem("workplan-agent-model") || "sonnet";
    // Resolve mode: explicit override, else current intake state
    const resolvedMode = mode
      || (freshData?.morningIntake?.[new Date().toISOString().slice(0, 10)]?.status === "active"
          || freshData?.morningIntake?.[new Date().toISOString().slice(0, 10)]?.status === "reviewing"
          ? "morning_intake" : "normal");
    const { parsed, rawJson, usage } = await callAgent(
      newMessages.slice(-20),
      freshData,
      freshCtx,
      newMessages.length,
      modelKey,
      resolvedMode,
    );
    if (parsed.actions && parsed.actions.length > 0) {
      handleAgentActions(parsed.actions, newMessages.length);
    }
    const assistantMsg = { role: "assistant", content: parsed.message || "Done.", rawJson, actions: parsed.actions || [], usage: usage || null, modelKey };
    const updated = [...newMessages, assistantMsg];
    const ts = await saveAgentHistory(updated);
    if (ts) syncTimestamps.current[AGENT_HISTORY_KEY] = ts;
    setAgentRefreshKey(k => k + 1);
    return parsed.message || "Done.";
  };

  // ── Morning intake kickoff (replaces FEA-33 silent auto-triage) ──
  // Once per day on first load: if no intake record exists for today
  // and there's no plan yet, fire a hidden trigger that gets the agent
  // to open with a contextual greeting and one focused question.
  const morningKickoffFiredRef = useRef(false);
  useEffect(() => {
    if (morningKickoffFiredRef.current) return;
    if (loading || !data) return;
    const today = new Date().toISOString().slice(0, 10);
    const intake = data.morningIntake?.[today];
    if (intake) {
      // Already started/skipped/done. If still active or reviewing,
      // resume by auto-opening the panel.
      if (intake.status === "active" || intake.status === "reviewing") {
        morningKickoffFiredRef.current = true;
        setAgentOpen(true);
      }
      return;
    }
    // Don't kick off if user already has a plan (e.g. accepted tomorrow draft).
    if ((data.todayPlan?.taskIds || []).length > 0) return;
    // Don't kick off in archive view
    if (viewingArchive) return;

    morningKickoffFiredRef.current = true;
    persist(prev => M.startMorningIntake(prev, today));
    setAgentOpen(true);

    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
    const kickoffPrompt =
      `[System: morning intake] It's ${dayName} ${today}. Open morning intake with Mark. ` +
      `Use the digest and feedback signals to ground your greeting in concrete current context (rolled-over tasks, ` +
      `WAITING items, due-date pressure, yesterday's log). Greet briefly, then ask ONE focused question. ` +
      `Do not list options. Do not call any tools yet — wait until you have enough context to call propose_morning_plan.`;
    handleTriageSubmit(kickoffPrompt, { hidden: true, mode: "morning_intake" })
      .catch(err => console.warn("Morning intake kickoff failed:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data?.morningIntake, viewingArchive]);

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
      <Header data={effectiveData} view={view} setView={setView} filter={filter} setFilter={setFilter} onNewWeek={handleNewWeek} onExport={handleExport} onReset={handleReset} viewingArchive={viewingArchive} archiveIndex={archiveIndex} onNavigateWeek={handleNavigateWeek} onJumpToWeek={handleJumpToWeek} offline={offline} onClearNowPin={!readOnly ? handleClearNowPin : undefined} />

      <div style={{ padding: mobile ? "16px" : "24px 32px", maxWidth: "960px" }}>
        {view === "today" && !viewingArchive && (
          <TodayView
            data={effectiveData}
            todayPlan={effectiveData.todayPlan || { date: null, taskIds: [], userNote: "" }}
            onUpdateTodayPlan={handleUpdateTodayPlan}
            onAddToToday={handleAddToToday}
            onRemoveFromToday={handleRemoveFromToday}
            onReorderToday={handleReorderToday}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleSubtask={handleToggleSubtask}
            onAddSubtask={handleAddSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            onTriageSubmit={handleTriageSubmit}
            onSetNowPin={handleSetNowPin}
            onClearNowPin={handleClearNowPin}
            onAcceptTomorrowDraft={handleAcceptTomorrowDraft}
            onDismissTomorrowDraft={handleDismissTomorrowDraft}
            onUpdateDailyLog={handleUpdateDailyLog}
            onAcceptProposal={handleAcceptProposal}
            onSkipProposal={handleSkipProposal}
            onEditProposal={handleEditProposal}
            onFinishMorningIntake={handleFinishMorningIntake}
            onSkipMorningIntake={handleSkipMorningIntake}
            onIterateMorningIntake={() => setAgentOpen(true)}
            onOpenAgent={() => setAgentOpen(true)}
          />
        )}
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
            <WeekShape weekShape={effectiveData.weekShape} workstreams={effectiveData.workstreams} readOnly={readOnly} onUpdateDay={handleUpdateDay} onAddDay={handleAddDay} onRemoveDay={handleRemoveDay} dailyLogs={effectiveData.dailyLogs || {}} />
            <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, #2A2A2E, transparent)", margin: "8px 0" }} />
            <div style={{ marginTop: "16px", background: "#18181B", borderRadius: "10px", padding: "16px", border: "1px solid #2A2A2E" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Quick Notes</div>
              <QuickNotes notes={effectiveData.notes} readOnly={readOnly} onAdd={handleAddNote} onDelete={handleDeleteNote} />
            </div>
          </>
        )}
        {view === "retro" && !viewingArchive && (
          <WeeklyRetro data={effectiveData} onTriageSubmit={handleTriageSubmit} />
        )}
        {view === "context" && (
          <ContextEditor contextDoc={contextDoc} onSave={handleContextSave} />
        )}
      </div>

      {!readOnly && <AgentPanel onApplyActions={handleAgentActions} onUndo={handleUndo} getUndoableMessages={getUndoableMessages} isOpen={agentOpen} onToggle={() => setAgentOpen(!agentOpen)} refreshKey={agentRefreshKey} onHistorySaved={handleHistorySaved} getFreshData={getFreshData} agentMode={agentMode} />}

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
