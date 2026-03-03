import { useState, useEffect, useCallback, useRef } from "react";
import { DEFAULT_DATA, STORAGE_KEY, CONTEXT_KEY, AGENT_HISTORY_KEY } from "./lib/constants.js";
import { loadData, saveData, loadContext, saveContext, getTimestamp } from "./lib/storage.js";
import { onAuthStateChange } from "./lib/auth.js";
import DEFAULT_CONTEXT from "./context/default-context.md?raw";
import Header from "./components/Header.jsx";
import StatsBar from "./components/StatsBar.jsx";
import Workstream from "./components/Workstream.jsx";
import WeekShape from "./components/WeekShape.jsx";
import QuickNotes from "./components/QuickNotes.jsx";
import ContextEditor from "./components/ContextEditor.jsx";
import AgentPanel from "./components/AgentPanel.jsx";
import LoginScreen from "./components/LoginScreen.jsx";

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

  const dataRef = useRef(null);
  const syncTimestamps = useRef({});

  useEffect(() => { dataRef.current = data; }, [data]);

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
    ]).then(([saved, ctx, dataTs, ctxTs, histTs]) => {
      const d = saved || DEFAULT_DATA;
      setData(d);
      dataRef.current = d;
      setContextDoc(ctx || DEFAULT_CONTEXT);
      syncTimestamps.current = {
        [STORAGE_KEY]: dataTs,
        [CONTEXT_KEY]: ctxTs,
        [AGENT_HISTORY_KEY]: histTs,
      };
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
        promises.push(loadData().then(saved => {
          if (saved) {
            setData(saved);
            dataRef.current = saved;
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

  // ── Handlers ────────────────────────────────────────────────────

  const handleStatusChange = (taskId, newStatus) => {
    persist(d => ({ ...d, workstreams: d.workstreams.map(ws => ({ ...ws, tasks: ws.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t) })) }));
  };
  const handleEdit = (taskId, updates) => {
    persist(d => ({ ...d, workstreams: d.workstreams.map(ws => ({ ...ws, tasks: ws.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) })) }));
  };
  const handleDelete = (taskId) => {
    persist(d => ({ ...d, workstreams: d.workstreams.map(ws => ({ ...ws, tasks: ws.tasks.filter(t => t.id !== taskId) })) }));
  };
  const handleAddTask = (wsId, task) => {
    persist(d => ({ ...d, workstreams: d.workstreams.map(ws => ws.id === wsId ? { ...ws, tasks: [...ws.tasks, task] } : ws) }));
  };
  const handleAddNote = (note) => {
    persist(d => ({ ...d, notes: [note, ...d.notes] }));
  };
  const handleDeleteNote = (idx) => {
    persist(d => ({ ...d, notes: d.notes.filter((_, i) => i !== idx) }));
  };
  const handleReset = () => {
    if (confirm("Reset all data to defaults? This cannot be undone.")) persist(() => DEFAULT_DATA);
  };
  const handleContextSave = async (text) => {
    setContextDoc(text);
    const ts = await saveContext(text);
    if (ts) syncTimestamps.current[CONTEXT_KEY] = ts;
  };

  const handleAgentActions = useCallback((actions) => {
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
      }
      return d;
    });
  }, [persist]);

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

  const filteredWorkstreams = data.workstreams.map(ws => ({
    ...ws,
    tasks: filter === "all" ? ws.tasks : filter === "active" ? ws.tasks.filter(t => t.status !== "DONE") : ws.tasks.filter(t => t.status === "DONE"),
  })).filter(ws => ws.tasks.length > 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0D0D0F", color: "#E5E5EA", fontFamily: "'DM Sans', sans-serif" }}>
      <Header data={data} view={view} setView={setView} filter={filter} setFilter={setFilter} onReset={handleReset} />

      <div style={{ padding: "24px 32px", maxWidth: "900px" }}>
        {view === "tasks" && (
          <>
            <StatsBar workstreams={data.workstreams} />
            {filteredWorkstreams.map(ws => (
              <Workstream key={ws.id} ws={ws} onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} onAddTask={handleAddTask} />
            ))}
            <div style={{ marginTop: "24px", background: "#18181B", borderRadius: "10px", padding: "16px", border: "1px solid #2A2A2E" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Quick Notes</div>
              <QuickNotes notes={data.notes} onAdd={handleAddNote} onDelete={handleDeleteNote} />
            </div>
          </>
        )}
        {view === "week" && (
          <>
            <WeekShape weekShape={data.weekShape} />
            <div style={{ marginTop: "16px", background: "#18181B", borderRadius: "10px", padding: "16px", border: "1px solid #2A2A2E" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Quick Notes</div>
              <QuickNotes notes={data.notes} onAdd={handleAddNote} onDelete={handleDeleteNote} />
            </div>
          </>
        )}
        {view === "context" && (
          <ContextEditor contextDoc={contextDoc} onSave={handleContextSave} />
        )}
      </div>

      <AgentPanel onApplyActions={handleAgentActions} isOpen={agentOpen} onToggle={() => setAgentOpen(!agentOpen)} refreshKey={agentRefreshKey} onHistorySaved={handleHistorySaved} getFreshData={getFreshData} />

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
    </div>
  );
}
