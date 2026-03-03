import { useState, useEffect, useCallback } from "react";
import { DEFAULT_DATA } from "./lib/constants.js";
import { loadData, saveData, loadContext, saveContext } from "./lib/storage.js";
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

  // Auth: onAuthStateChange emits INITIAL_SESSION on setup, then
  // SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED as needed — single source of truth.
  useEffect(() => {
    const subscription = onAuthStateChange((s) => {
      setSession(s);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data once when authenticated. Using !!session so token refreshes
  // (which swap the session object but keep it truthy) don't re-fetch.
  const isAuthenticated = !!session;
  useEffect(() => {
    if (!isAuthenticated) {
      // Reset on sign-out so re-login gets a clean slate
      setData(null);
      setLoading(true);
      return;
    }
    setLoading(true);
    Promise.all([loadData(), loadContext()]).then(([saved, ctx]) => {
      setData(saved || DEFAULT_DATA);
      setContextDoc(ctx || DEFAULT_CONTEXT);
      setLoading(false);
    });
  }, [isAuthenticated]);

  const persist = useCallback((newData) => { setData(newData); saveData(newData); }, []);

  const handleStatusChange = (taskId, newStatus) => {
    const d = { ...data, workstreams: data.workstreams.map(ws => ({ ...ws, tasks: ws.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t) })) };
    persist(d);
  };
  const handleEdit = (taskId, updates) => {
    const d = { ...data, workstreams: data.workstreams.map(ws => ({ ...ws, tasks: ws.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) })) };
    persist(d);
  };
  const handleDelete = (taskId) => {
    const d = { ...data, workstreams: data.workstreams.map(ws => ({ ...ws, tasks: ws.tasks.filter(t => t.id !== taskId) })) };
    persist(d);
  };
  const handleAddTask = (wsId, task) => {
    const d = { ...data, workstreams: data.workstreams.map(ws => ws.id === wsId ? { ...ws, tasks: [...ws.tasks, task] } : ws) };
    persist(d);
  };
  const handleAddNote = (note) => { persist({ ...data, notes: [note, ...data.notes] }); };
  const handleDeleteNote = (idx) => { persist({ ...data, notes: data.notes.filter((_, i) => i !== idx) }); };
  const handleReset = () => { if (confirm("Reset all data to defaults? This cannot be undone.")) persist(DEFAULT_DATA); };
  const handleContextSave = (text) => { setContextDoc(text); saveContext(text); };

  const handleAgentActions = useCallback((actions) => {
    setData(prev => {
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
      saveData(d);
      return d;
    });
  }, []);

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

      <AgentPanel data={data} contextDoc={contextDoc} onApplyActions={handleAgentActions} isOpen={agentOpen} onToggle={() => setAgentOpen(!agentOpen)} />
    </div>
  );
}
