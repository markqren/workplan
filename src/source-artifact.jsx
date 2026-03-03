import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "work-tracker-v1";
const AGENT_HISTORY_KEY = "work-tracker-agent-history";
const CONTEXT_KEY = "work-tracker-context";

// ── Default editable context (stored in persistent storage) ────────
const DEFAULT_CONTEXT = `## WHO MARK IS
Senior Data Scientist at Pinterest, working on merchant segmentation and targeting within the monetization data science org. Reports directly to Agnal (DS Senior Director) — an unusual skip-level reporting structure designed to give Mark elevated authority. Mark's strengths are narrative construction, executive influence, and strategic framing rather than pure technical depth.

## TEAM & KEY PEOPLE
- **Agnal**: DS Senior Director, Mark's direct manager and sponsor. Actively backs Mark, manages politics on his behalf. Has explicitly positioned Mark as the lead on segmentation work.
- **Mita**: VP of Product. Senior executive sponsor of Mark's external sizing approach. Key decision-maker.
- **Tim Keil**: Staff Data Scientist. Built the existing 1P internal merchant segmentation. Generally collaborative and agreeable, but protective of his work. Has received feedback from other directors and can seem demotivated. Works under May.
- **Apoorva**: Tim's manager.
- **May**: Director over Tim and Apoorva's team. Returned from mat leave. Can be oppositional to Mark's framing, but her instincts are often directionally correct. Relationship is functional but not warm.
- **Brandye**: Sr Dir PM, Free to Paid. Has requested external Torso segmentation data.
- **Jerry**: Marketing Science manager running ROAS measurement workstream. Manages Anish and Gobi (both ex-Google). Organized team doing solid work.
- **Gobi**: On Jerry's team, also involved in EP Health Check deep dives with Agnal.

## THE SEGMENTATION LANDSCAPE
There are four competing merchant segmentation definitions causing organizational confusion:
1. **Sales Enterprise/SMB split** — oriented by sales resources
2. **Tim's 1P internal segmentation** — based on Pinterest first-party signals
3. **Mark's external GMV-based approach (3P)** — uses external data like StoreLeads to estimate merchant size
4. **Shopify as proxy** — people loosely using "Shopify merchant" as shorthand for mid-size/Torso

Mark's key contribution is showing the *intersection* of 1P and 3P — the "Ads-Ready" quadrant analysis. Merchants who are internal-Torso-but-not-external may indicate organic-only/F2P bucket. This is the strategic insight leadership cares about.

The core narrative reframe: F2P is NOT a linear funnel. It's one component of a broader merchant strategy. Merchant size and Pinterest journey stage are two separate dimensions. F2P applies to one zone of that matrix.

Key data tables: pads_aig.merchants_torso_definition (merchant-level with torso labels and definition metrics).

## WORKSTREAM CONTEXT
- **Segmentation**: The primary deliverable. Involves both narrative/strategic work (reframing, positioning, deck updates) and data/SQL work (unified datasets, sub-segment definitions, coverage validation). Tuesday meeting with May's team is a key milestone.
- **Staples**: Launched early Feb, strong reception. EP Health Check is a biweekly sub-workstream. Significant backlog on pause.
- **Horizontal Team**: Jerry's ROAS measurement. Mark provides advisory/narrative support.

## COMMUNICATION & WORKING STYLE
- Mark values clarity and directness over verbosity
- Strengths in narrative construction and executive influence
- Can experience anxiety presenting to DS peers (perceived technical judgment) vs. comfort with leadership audiences
- Has grown in standing his ground during conflicts without folding — represents a shift from typical conflict-avoidant patterns
- Navigates politics strategically: direct communication with senior leadership while preserving working relationships`;

// ── Fixed agent instructions (not user-editable) ───────────────────
const buildSystemPrompt = (trackerData, contextDoc) => `You are an embedded AI agent inside Mark's personal work tracker app. You have deep context about his work, team, and current priorities. You act as both a task management assistant and a strategic thought partner.

${contextDoc}

## TASK TYPES
- N = Narrative/Strategic (framing, decks, positioning)
- D = Data/SQL (queries, datasets, validation)
- A = Advisory (feedback, check-ins, guidance to other teams)
- -- = Misc

## STATUSES
NOT STARTED | IN PROGRESS | WAITING | DONE

## HOW TO BEHAVE
- You can read and modify the tracker state. When the user asks you to add, update, delete, or change tasks, respond with a JSON action block.
- Be concise and direct. Mark values clarity over verbosity.
- You understand the political dynamics. When Mark mentions a person or situation, you have context on the relationships and can offer strategic reads.
- When adding tasks, infer the right workstream, type, and urgency from context.
- You can help Mark think through prioritization, prep for meetings, draft responses, or strategize.
- If Mark shares a screenshot or describes a Slack message, help him triage it and add it to the tracker if needed.

## CURRENT TRACKER STATE
${JSON.stringify(trackerData, null, 2)}

## RESPONSE FORMAT
Always respond with a JSON object (and nothing else) with this shape:
{
  "message": "Your conversational response to Mark",
  "actions": [
    {
      "type": "add_task",
      "workstream_id": "seg",
      "task": { "id": "SEG-11", "type": "D", "title": "...", "status": "NOT STARTED", "target": "..." }
    },
    {
      "type": "update_task",
      "task_id": "SEG-5",
      "updates": { "status": "DONE" }
    },
    {
      "type": "delete_task",
      "task_id": "SEG-3"
    },
    {
      "type": "add_note",
      "text": "..."
    }
  ]
}

The "actions" array can be empty if no tracker changes are needed. Always include "message". Do NOT wrap the JSON in markdown code fences.`;

// ── Defaults seeded from action plan ───────────────────────────────
const DEFAULT_DATA = {
  weekLabel: "Week of March 2-6",
  lastUpdated: new Date().toISOString(),
  workstreams: [
    {
      id: "seg", name: "Segmentation", prefix: "SEG", color: "#E8A838",
      description: "2026 Merchant Segmentation and Strategy",
      tasks: [
        { id: "SEG-1", type: "N", title: "Reframe F2P narrative: F2P is not a linear funnel, it is one component of a broader merchant strategy.", status: "IN PROGRESS", target: "Mon" },
        { id: "SEG-2", type: "N", title: "Torso sub-segmentation framing: Define ads-ready vs other stages. Decision tree logic.", status: "NOT STARTED", target: "Mon-Tue" },
        { id: "SEG-3", type: "N", title: "Position relative to Tim 1P segmentation. Diplomatic armor for May meeting.", status: "NOT STARTED", target: "Mon" },
        { id: "SEG-4", type: "N", title: "Update slide deck: Incorporate reframed narrative and new visuals.", status: "IN PROGRESS", target: "Tue AM" },
        { id: "SEG-5", type: "D", title: "Build unified 1P + 3P dataset. Foundation for everything else.", status: "IN PROGRESS", target: "Mon" },
        { id: "SEG-6", type: "D", title: "Define Torso sub-segments in SQL. Ads-ready framing into data cuts.", status: "NOT STARTED", target: "Mon-Tue" },
        { id: "SEG-7", type: "D", title: "Validate coverage/overlap numbers for updated narrative.", status: "NOT STARTED", target: "Tue AM" },
        { id: "SEG-8", type: "D", title: "Brandye request: Pull external Torso segmentation data. Awaiting clarification.", status: "WAITING", target: "TBD" },
        { id: "SEG-9", type: "D", title: "Mita request: Provide access/docs for Torso segmentation table.", status: "DONE", target: "Mon" },
        { id: "SEG-10", type: "D", title: "Tim Keil Qs on torso tables (bumped Feb 27): StoreLeads date field, join method, time windows for product metrics. Urgent.", status: "DONE", target: "Mon" },
      ],
    },
    {
      id: "stp", name: "Staples", prefix: "STP", color: "#5B8DEF",
      description: "EP Health Check biweekly sub-workstream",
      tasks: [
        { id: "STP-1", type: "N", title: "Detail outstanding Staples backlog: Brain dump all paused items.", status: "NOT STARTED", target: "This week" },
        { id: "STP-2", type: "A", title: "EP Health Check prep: Confirm needs for next cycle, check in with Agnal/Gobi.", status: "NOT STARTED", target: "Tue-Wed" },
      ],
    },
    {
      id: "hz", name: "Horizontal Team", prefix: "HZ", color: "#6CC4A1",
      description: "Jerry ROAS measurement workstream",
      tasks: [
        { id: "HZ-1", type: "A", title: "ROAS narrative check-in: Attended meeting, provided feedback.", status: "DONE", target: "Mon" },
      ],
    },
    {
      id: "oth", name: "Other", prefix: "OTH", color: "#A78BDB",
      description: "Misc tasks",
      tasks: [
        { id: "OTH-1", type: "--", title: "Scan Slack/email backlog from Cozumel week. Triage responses.", status: "NOT STARTED", target: "Mon-Tue" },
        { id: "OTH-2", type: "D", title: "Build custom work tracker app. Persistent storage, built-in agent.", status: "IN PROGRESS", target: "Future" },
      ],
    },
  ],
  weekShape: [
    { day: "Sunday", focus: "DONE", activities: "Plan organized, SEG-1 started, SEG-5 started, May invite sent" },
    { day: "Monday", focus: "DONE", activities: "SEG-9 done, SEG-8 responded, HZ-1 done, slide progress, dataset work" },
    { day: "Tuesday AM", focus: "PREP", activities: "SEG-4 finalize, SEG-7 validation, SEG-2/3 framing" },
    { day: "Tuesday", focus: "MAY MEETING", activities: "Present progress, get alignment" },
    { day: "Wed-Fri", focus: "EXECUTE", activities: "Incorporate feedback, SEG-5/6 continue, STP-1 backlog dump" },
  ],
  notes: [],
};

// ── Config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  "NOT STARTED": { bg: "#2A2A2E", fg: "#8E8E93", border: "#3A3A3E" },
  "IN PROGRESS": { bg: "#1A2A1A", fg: "#6CC4A1", border: "#2A4A2A" },
  "WAITING":     { bg: "#2A2518", fg: "#E8A838", border: "#4A3A18" },
  "DONE":        { bg: "#1A1A2A", fg: "#5B8DEF", border: "#2A2A4A" },
};
const TYPE_LABELS = { N: "Narrative", D: "Data/SQL", A: "Advisory", "--": "Misc" };
const TYPE_ICONS = { N: "◇", D: "⬡", A: "△", "--": "○" };
const STATUSES = ["NOT STARTED", "IN PROGRESS", "WAITING", "DONE"];

// ── Storage ────────────────────────────────────────────────────────
async function loadData() {
  try { const r = await window.storage.get(STORAGE_KEY); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function saveData(data) {
  try { data.lastUpdated = new Date().toISOString(); await window.storage.set(STORAGE_KEY, JSON.stringify(data)); }
  catch (e) { console.error("Save failed:", e); }
}
async function loadAgentHistory() {
  try { const r = await window.storage.get(AGENT_HISTORY_KEY); return r ? JSON.parse(r.value) : []; }
  catch { return []; }
}
async function saveAgentHistory(history) {
  try { await window.storage.set(AGENT_HISTORY_KEY, JSON.stringify(history.slice(-30))); }
  catch (e) { console.error("Agent history save failed:", e); }
}
async function loadContext() {
  try { const r = await window.storage.get(CONTEXT_KEY); return r ? r.value : null; }
  catch { return null; }
}
async function saveContext(text) {
  try { await window.storage.set(CONTEXT_KEY, text); }
  catch (e) { console.error("Context save failed:", e); }
}

// ── Small components ───────────────────────────────────────────────

function StatusBadge({ status, onClick }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG["NOT STARTED"];
  return (
    <button onClick={onClick} style={{
      background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
      padding: "3px 10px", borderRadius: "4px", fontSize: "10px",
      fontWeight: 600, letterSpacing: "0.5px", cursor: "pointer",
      textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace",
      transition: "all 0.15s ease",
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

function TaskRow({ task, onStatusChange, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editTarget, setEditTarget] = useState(task.target);

  const cycleStatus = () => {
    const idx = STATUSES.indexOf(task.status);
    onStatusChange(task.id, STATUSES[(idx + 1) % STATUSES.length]);
  };

  const handleSave = () => {
    onEdit(task.id, { title: editTitle, target: editTarget });
    setEditing(false);
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
          <div style={{ flex: 1 }} />
          <button onClick={handleSave} style={{ background: "#6CC4A1", color: "#0D0D0F", border: "none", borderRadius: "4px", padding: "4px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Save</button>
          <button onClick={() => setEditing(false)} style={{ background: "transparent", color: "#6E6E73", border: "1px solid #3A3A3E", borderRadius: "4px", padding: "4px 12px", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px",
      background: task.status === "DONE" ? "#111114" : "#1C1C1E",
      borderRadius: "8px", marginBottom: "4px", transition: "all 0.15s ease",
      opacity: task.status === "DONE" ? 0.55 : 1,
      borderLeft: `3px solid ${STATUS_CONFIG[task.status]?.fg || "#3A3A3E"}`,
    }}>
      <div style={{ minWidth: "64px" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#8E8E93", fontWeight: 600 }}>{task.id}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: "4px" }}>
          <TypeTag type={task.type} />
          <span style={{ fontSize: "11px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace" }}>→ {task.target}</span>
        </div>
        <div style={{ fontSize: "13px", color: task.status === "DONE" ? "#6E6E73" : "#E5E5EA", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", textDecoration: task.status === "DONE" ? "line-through" : "none" }}>
          {task.title}
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
        <StatusBadge status={task.status} onClick={cycleStatus} />
        <button onClick={() => setEditing(true)} title="Edit" style={{ background: "transparent", border: "none", color: "#6E6E73", cursor: "pointer", fontSize: "14px", padding: "2px 4px" }}>✎</button>
        <button onClick={() => onDelete(task.id)} title="Delete" style={{ background: "transparent", border: "none", color: "#4A2020", cursor: "pointer", fontSize: "14px", padding: "2px 4px" }}>×</button>
      </div>
    </div>
  );
}

function Workstream({ ws, onStatusChange, onEdit, onDelete, onAddTask }) {
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("N");
  const [newTarget, setNewTarget] = useState("");

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
      <div onClick={() => setCollapsed(!collapsed)} style={{
        display: "flex", alignItems: "center", gap: "12px", cursor: "pointer",
        padding: "12px 16px", background: "#18181B", borderRadius: "10px",
        border: `1px solid ${ws.color}22`, marginBottom: collapsed ? 0 : "8px", transition: "all 0.15s ease",
      }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: ws.color, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "14px", fontWeight: 700, color: "#E5E5EA", letterSpacing: "0.5px" }}>{ws.name}</span>
          <span style={{ fontSize: "11px", color: "#6E6E73", marginLeft: "10px", fontFamily: "'DM Sans', sans-serif" }}>{ws.description}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <div style={{ width: "60px", height: "4px", background: "#2A2A2E", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: ws.color, borderRadius: "2px", transition: "width 0.3s ease" }} />
            </div>
            <span style={{ fontSize: "10px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace", minWidth: "32px" }}>{done}/{total}</span>
          </div>
          {inProg > 0 && <span style={{ fontSize: "10px", color: "#6CC4A1", fontFamily: "'JetBrains Mono', monospace" }}>{inProg} active</span>}
          <span style={{ color: "#6E6E73", fontSize: "12px", transition: "transform 0.2s", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
        </div>
      </div>
      {!collapsed && (
        <div style={{ paddingLeft: "8px" }}>
          {ws.tasks.map(task => (
            <TaskRow key={task.id} task={task} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />
          ))}
          {adding ? (
            <div style={{ padding: "12px 16px", background: "#1C1C1E", borderRadius: "8px", border: "1px dashed #3A3A3E", marginTop: "4px" }}>
              <textarea value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task description..."
                style={{ width: "100%", background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #3A3A3E", borderRadius: "6px", padding: "8px", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", resize: "vertical", minHeight: "48px", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
                <select value={newType} onChange={e => setNewType(e.target.value)} style={{ background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #3A3A3E", borderRadius: "4px", padding: "4px 8px", fontSize: "11px" }}>
                  <option value="N">Narrative</option><option value="D">Data/SQL</option><option value="A">Advisory</option><option value="--">Misc</option>
                </select>
                <input value={newTarget} onChange={e => setNewTarget(e.target.value)} placeholder="Target"
                  style={{ background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #3A3A3E", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", width: "80px", fontFamily: "'JetBrains Mono', monospace" }} />
                <div style={{ flex: 1 }} />
                <button onClick={handleAdd} style={{ background: ws.color, color: "#0D0D0F", border: "none", borderRadius: "4px", padding: "4px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Add</button>
                <button onClick={() => setAdding(false)} style={{ background: "transparent", color: "#6E6E73", border: "1px solid #3A3A3E", borderRadius: "4px", padding: "4px 12px", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} style={{
              background: "transparent", border: "1px dashed #2A2A2E", borderRadius: "8px",
              padding: "8px 14px", color: "#4A4A4E", fontSize: "12px", cursor: "pointer",
              width: "100%", textAlign: "left", fontFamily: "'DM Sans', sans-serif", marginTop: "4px",
            }}>+ Add task</button>
          )}
        </div>
      )}
    </div>
  );
}

function WeekShape({ weekShape }) {
  return (
    <div style={{ background: "#18181B", borderRadius: "10px", padding: "16px", marginBottom: "24px", border: "1px solid #2A2A2E" }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Week Shape</div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {weekShape.map((day, i) => {
          const focusColor = day.focus === "DONE" ? "#5B8DEF" : day.focus === "PREP" ? "#E8A838" : day.focus === "EXECUTE" ? "#6CC4A1" : day.focus.includes("MEETING") ? "#E85B5B" : "#8E8E93";
          return (
            <div key={i} style={{ flex: "1 1 180px", background: "#1C1C1E", borderRadius: "8px", padding: "10px 12px", borderTop: `2px solid ${focusColor}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#E5E5EA", fontWeight: 600 }}>{day.day}</span>
                <span style={{ fontSize: "9px", color: focusColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.5px" }}>{day.focus}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#8E8E93", lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>{day.activities}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsBar({ workstreams }) {
  const all = workstreams.flatMap(w => w.tasks);
  const total = all.length;
  const done = all.filter(t => t.status === "DONE").length;
  const inProg = all.filter(t => t.status === "IN PROGRESS").length;
  const waiting = all.filter(t => t.status === "WAITING").length;
  const notStarted = all.filter(t => t.status === "NOT STARTED").length;

  return (
    <div style={{ display: "flex", gap: "20px", padding: "14px 20px", background: "#18181B", borderRadius: "10px", marginBottom: "24px", border: "1px solid #2A2A2E", flexWrap: "wrap" }}>
      {[
        { label: "Total", value: total, color: "#E5E5EA" },
        { label: "Done", value: done, color: "#5B8DEF" },
        { label: "Active", value: inProg, color: "#6CC4A1" },
        { label: "Waiting", value: waiting, color: "#E8A838" },
        { label: "Not Started", value: notStarted, color: "#8E8E93" },
      ].map(s => (
        <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "22px", fontWeight: 700, color: s.color }}>{s.value}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#6E6E73", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</span>
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <div style={{ width: "120px", height: "6px", background: "#2A2A2E", borderRadius: "3px", overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${total > 0 ? (done/total)*100 : 0}%`, background: "#5B8DEF", transition: "width 0.3s" }} />
          <div style={{ width: `${total > 0 ? (inProg/total)*100 : 0}%`, background: "#6CC4A1", transition: "width 0.3s" }} />
          <div style={{ width: `${total > 0 ? (waiting/total)*100 : 0}%`, background: "#E8A838", transition: "width 0.3s" }} />
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#6E6E73" }}>{total > 0 ? Math.round((done/total)*100) : 0}%</span>
      </div>
    </div>
  );
}

// ── Agent Panel ────────────────────────────────────────────────────

function AgentPanel({ data, contextDoc, onApplyActions, isOpen, onToggle }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadAgentHistory().then(h => setMessages(h));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const recentHistory = newMessages.slice(-20).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.role === "user" ? m.content : (m.rawJson || m.content),
      }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildSystemPrompt(data, contextDoc),
          messages: recentHistory,
        }),
      });

      const result = await response.json();
      const text = result.content?.map(c => c.text || "").join("") || "";

      let parsed;
      try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { message: text, actions: [] };
      }

      if (parsed.actions && parsed.actions.length > 0) {
        onApplyActions(parsed.actions);
      }

      const assistantMsg = {
        role: "assistant",
        content: parsed.message || "Done.",
        rawJson: text,
        actions: parsed.actions || [],
      };
      const updated = [...newMessages, assistantMsg];
      setMessages(updated);
      saveAgentHistory(updated);
    } catch (err) {
      const errorMsg = { role: "assistant", content: `Error: ${err.message}`, actions: [] };
      setMessages(prev => [...prev, errorMsg]);
    }
    setLoading(false);
  };

  const actionLabels = (actions) => {
    if (!actions || actions.length === 0) return [];
    return actions.map(a => {
      if (a.type === "add_task") return `+ ${a.task?.id || "task"}`;
      if (a.type === "update_task") return `↻ ${a.task_id}`;
      if (a.type === "delete_task") return `− ${a.task_id}`;
      if (a.type === "add_note") return "📝 note";
      return null;
    }).filter(Boolean);
  };

  if (!isOpen) {
    return (
      <button onClick={onToggle} style={{
        position: "fixed", bottom: "24px", right: "24px", width: "52px", height: "52px",
        borderRadius: "50%", background: "linear-gradient(135deg, #E8A838, #E85B5B)",
        border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "22px", boxShadow: "0 4px 20px rgba(232,168,56,0.3)",
        transition: "transform 0.15s ease", zIndex: 100,
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >⬡</button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", width: "420px", height: "520px",
      background: "#131316", borderRadius: "16px", border: "1px solid #2A2A2E",
      display: "flex", flexDirection: "column", zIndex: 100,
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #2A2A2E", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "16px" }}>⬡</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "13px", fontWeight: 700, color: "#E5E5EA", flex: 1 }}>Agent</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#4A4A4E" }}>context-aware</span>
        <button onClick={() => { setMessages([]); saveAgentHistory([]); }} title="Clear history" style={{ background: "transparent", border: "none", color: "#3A3A3E", cursor: "pointer", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}>clear</button>
        <button onClick={onToggle} style={{ background: "transparent", border: "none", color: "#6E6E73", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}>×</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages.length === 0 && (
          <div style={{ color: "#3A3A3E", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", textAlign: "center", marginTop: "40px", lineHeight: 1.8 }}>
            <div style={{ fontSize: "28px", marginBottom: "12px", opacity: 0.4 }}>⬡</div>
            I know your workstreams, team,<br />and priorities.<br /><br />
            <span style={{ color: "#4A4A4E" }}>
              "mark SEG-5 as done"<br />
              "add a task to prep for May meeting"<br />
              "what should I focus on next?"<br />
              "Brandye just responded, update SEG-8"
            </span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "85%", padding: "10px 14px",
              borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
              background: msg.role === "user" ? "#2A2518" : "#1C1C1E",
              color: "#E5E5EA", fontSize: "13px", lineHeight: 1.5,
              fontFamily: "'DM Sans', sans-serif",
              border: `1px solid ${msg.role === "user" ? "#4A3A18" : "#2A2A2E"}`,
              whiteSpace: "pre-wrap",
            }}>
              {msg.content}
            </div>
            {msg.actions && msg.actions.length > 0 && (
              <div style={{ maxWidth: "85%", marginTop: "4px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {actionLabels(msg.actions).map((a, j) => (
                  <span key={j} style={{
                    fontSize: "9px", fontFamily: "'JetBrains Mono', monospace",
                    color: "#6CC4A1", background: "#1A2A1A", border: "1px solid #2A4A2A",
                    padding: "2px 8px", borderRadius: "3px",
                  }}>{a}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{
              padding: "10px 14px", borderRadius: "12px 12px 12px 4px",
              background: "#1C1C1E", border: "1px solid #2A2A2E",
              color: "#6E6E73", fontSize: "13px", fontFamily: "'DM Sans', sans-serif",
            }}>
              <span className="agent-thinking">thinking...</span>
              <style>{`.agent-thinking { animation: agentPulse 1s ease-in-out infinite; } @keyframes agentPulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }`}</style>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid #2A2A2E" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Tell me what to do..."
            style={{
              flex: 1, background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #2A2A2E",
              borderRadius: "8px", padding: "10px 14px", fontSize: "13px",
              fontFamily: "'DM Sans', sans-serif", outline: "none",
            }}
            onFocus={e => e.target.style.borderColor = "#E8A838"}
            onBlur={e => e.target.style.borderColor = "#2A2A2E"}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()} style={{
            background: input.trim() ? "linear-gradient(135deg, #E8A838, #E85B5B)" : "#2A2A2E",
            border: "none", borderRadius: "8px", padding: "0 16px", cursor: input.trim() ? "pointer" : "default",
            color: input.trim() ? "#0D0D0F" : "#4A4A4E", fontWeight: 700, fontSize: "14px",
          }}>→</button>
        </div>
      </div>
    </div>
  );
}

// ── Quick Notes (inline) ───────────────────────────────────────────

function QuickNotesInline({ notes, onAdd, onDelete }) {
  const [text, setText] = useState("");
  const handleAdd = () => { if (!text.trim()) return; onAdd({ text, ts: new Date().toISOString() }); setText(""); };
  return (
    <>
      <div style={{ display: "flex", gap: "8px", marginBottom: notes.length > 0 ? "10px" : 0 }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Jot something down..."
          style={{ flex: 1, background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #2A2A2E", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }} />
        <button onClick={handleAdd} style={{ background: "#2A2A2E", color: "#E5E5EA", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>+</button>
      </div>
      {notes.map((n, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", padding: "6px 0", borderBottom: i < notes.length - 1 ? "1px solid #1C1C1E" : "none" }}>
          <span style={{ fontSize: "10px", color: "#4A4A4E", fontFamily: "'JetBrains Mono', monospace", minWidth: "50px", paddingTop: "2px" }}>
            {new Date(n.ts).toLocaleDateString("en-US", { weekday: "short" })}
          </span>
          <span style={{ flex: 1, fontSize: "12px", color: "#C7C7CC", fontFamily: "'DM Sans', sans-serif" }}>{n.text}</span>
          <button onClick={() => onDelete(i)} style={{ background: "transparent", border: "none", color: "#3A3A3E", cursor: "pointer", fontSize: "12px", padding: "0 4px" }}>×</button>
        </div>
      ))}
    </>
  );
}

// ── Context Editor ─────────────────────────────────────────────────

function ContextEditor({ contextDoc, onSave }) {
  const [text, setText] = useState(contextDoc);
  const [saved, setSaved] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { setText(contextDoc); }, [contextDoc]);

  const handleSave = () => {
    onSave(text);
    setSaved(true);
    setTimeout(() => setSaved(true), 2000);
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{
        background: "#18181B", borderRadius: "10px", padding: "16px", border: "1px solid #2A2A2E", marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73", textTransform: "uppercase", letterSpacing: "1px", flex: 1 }}>
            Agent Briefing Document
          </div>
          <span style={{ fontSize: "10px", color: "#4A4A4E", fontFamily: "'JetBrains Mono', monospace" }}>
            {text.length} chars
          </span>
        </div>
        <div style={{ fontSize: "11px", color: "#6E6E73", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", marginBottom: "12px" }}>
          This is the agent's persistent memory — everything it knows about your role, team, projects, and dynamics.
          Edit it directly, and it'll be used on every agent interaction. No code changes needed.
        </div>
      </div>

      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setSaved(false); }}
        spellCheck={false}
        style={{
          width: "100%", minHeight: "500px", background: "#1C1C1E", color: "#E5E5EA",
          border: "1px solid #2A2A2E", borderRadius: "10px", padding: "16px",
          fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7,
          resize: "vertical", boxSizing: "border-box", outline: "none",
        }}
        onFocus={e => e.target.style.borderColor = "#E8A838"}
        onBlur={e => e.target.style.borderColor = "#2A2A2E"}
      />

      <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center" }}>
        <button onClick={handleSave} style={{
          background: saved ? "#2A2A2E" : "linear-gradient(135deg, #E8A838, #E85B5B)",
          color: saved ? "#6E6E73" : "#0D0D0F",
          border: "none", borderRadius: "6px", padding: "8px 20px", fontSize: "12px",
          fontWeight: 600, cursor: "pointer", fontFamily: "'Space Mono', monospace",
          transition: "all 0.15s ease",
        }}>
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
        <button onClick={() => { setText(DEFAULT_CONTEXT); setSaved(false); }} style={{
          background: "transparent", color: "#4A4A4E", border: "1px solid #2A2A2E",
          borderRadius: "6px", padding: "8px 16px", fontSize: "11px", cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          Reset to default
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "10px", color: "#3A3A3E", fontFamily: "'JetBrains Mono', monospace" }}>
          markdown supported
        </span>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────

export default function WorkTracker() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("tasks");
  const [filter, setFilter] = useState("all");
  const [agentOpen, setAgentOpen] = useState(false);
  const [contextDoc, setContextDoc] = useState(DEFAULT_CONTEXT);

  useEffect(() => {
    Promise.all([loadData(), loadContext()]).then(([saved, ctx]) => {
      setData(saved || DEFAULT_DATA);
      setContextDoc(ctx || DEFAULT_CONTEXT);
      setLoading(false);
    });
  }, []);

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

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#0D0D0F", display: "flex", alignItems: "center", justifyContent: "center", color: "#6E6E73", fontFamily: "'Space Mono', monospace" }}>Loading...</div>;
  }

  const filteredWorkstreams = data.workstreams.map(ws => ({
    ...ws,
    tasks: filter === "all" ? ws.tasks : filter === "active" ? ws.tasks.filter(t => t.status !== "DONE") : ws.tasks.filter(t => t.status === "DONE"),
  })).filter(ws => ws.tasks.length > 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0D0D0F", color: "#E5E5EA", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=JetBrains+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ padding: "24px 32px 16px", borderBottom: "1px solid #1C1C1E", position: "sticky", top: 0, background: "#0D0D0F", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "12px" }}>
          <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: "20px", fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>⬡ WORKPLAN</h1>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#6E6E73" }}>{data.weekLabel}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#3A3A3E" }}>
            saved {new Date(data.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={handleReset} style={{ background: "transparent", border: "none", color: "#3A3A3E", fontSize: "10px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>reset</button>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {[{ id: "tasks", label: "Tasks" }, { id: "week", label: "Week" }, { id: "context", label: "Context" }].map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              background: view === v.id ? "#2A2A2E" : "transparent", color: view === v.id ? "#E5E5EA" : "#6E6E73",
              border: "1px solid", borderColor: view === v.id ? "#3A3A3E" : "transparent",
              borderRadius: "6px", padding: "5px 14px", fontSize: "12px", cursor: "pointer",
              fontFamily: "'Space Mono', monospace", fontWeight: 600,
            }}>{v.label}</button>
          ))}
          <div style={{ width: "1px", background: "#2A2A2E", margin: "0 4px" }} />
          {view !== "context" && ["all", "active", "done"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: "transparent", color: filter === f ? "#E5E5EA" : "#4A4A4E",
              border: "none", fontSize: "11px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
              textTransform: "uppercase", letterSpacing: "0.5px",
              borderBottom: filter === f ? "1px solid #6E6E73" : "1px solid transparent", padding: "5px 8px",
            }}>{f}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: "900px" }}>
        {view === "tasks" && (
          <>
            <StatsBar workstreams={data.workstreams} />
            {filteredWorkstreams.map(ws => (
              <Workstream key={ws.id} ws={ws} onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} onAddTask={handleAddTask} />
            ))}
            <div style={{ marginTop: "24px", background: "#18181B", borderRadius: "10px", padding: "16px", border: "1px solid #2A2A2E" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Quick Notes</div>
              <QuickNotesInline notes={data.notes} onAdd={handleAddNote} onDelete={handleDeleteNote} />
            </div>
          </>
        )}
        {view === "week" && (
          <>
            <WeekShape weekShape={data.weekShape} />
            <div style={{ marginTop: "16px", background: "#18181B", borderRadius: "10px", padding: "16px", border: "1px solid #2A2A2E" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Quick Notes</div>
              <QuickNotesInline notes={data.notes} onAdd={handleAddNote} onDelete={handleDeleteNote} />
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
