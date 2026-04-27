import { useMemo, useState } from "react";
import { TYPE_LABELS } from "../lib/constants.js";

// ── Helpers ────────────────────────────────────────────────────────

const KIND_LABELS = {
  focus_note: "Set today's focus",
  priority: "Add to today's plan",
  new_task: "Create new task",
  new_subtask: "Add subtask",
  now_pin: "Pin as 'now working on'",
  context_update: "Save to briefing doc",
};

const KIND_ICONS = {
  focus_note: "✦",
  priority: "▸",
  new_task: "+",
  new_subtask: "↳",
  now_pin: "▶",
  context_update: "📌",
};

const KIND_ACCENTS = {
  focus_note: "#E8A838",
  priority: "#5B8DEF",
  new_task: "#6CC4A1",
  new_subtask: "#A78BDB",
  now_pin: "#E85B5B",
  context_update: "#8E8E93",
};

const CONTEXT_SECTIONS = [
  "People",
  "Preferences",
  "Project: Segmentation",
  "Project: Staples",
  "Project: Horizontal",
  "Recent Decisions",
  "Working Style",
];

// ── Field components ──────────────────────────────────────────────

function Label({ children }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: "9px",
      color: "#6E6E73", textTransform: "uppercase", letterSpacing: "0.5px",
      marginBottom: "3px",
    }}>{children}</div>
  );
}

function TextInput({ value, onChange, placeholder, multiline = false, ...rest }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <Tag
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", boxSizing: "border-box",
        background: "#0D0D0F", color: "#E5E5EA",
        border: "1px solid #2A2A2E", borderRadius: "6px",
        padding: "8px 10px", fontSize: "12px",
        fontFamily: "'DM Sans', sans-serif", outline: "none",
        ...(multiline ? { minHeight: "60px", resize: "vertical", lineHeight: 1.5 } : {}),
      }}
      onFocus={e => e.target.style.borderColor = "#E8A838"}
      onBlur={e => e.target.style.borderColor = "#2A2A2E"}
      {...rest}
    />
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", boxSizing: "border-box",
        background: "#0D0D0F", color: "#E5E5EA",
        border: "1px solid #2A2A2E", borderRadius: "6px",
        padding: "8px 10px", fontSize: "12px",
        fontFamily: "'DM Sans', sans-serif", outline: "none",
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Proposal editors (one per kind) ───────────────────────────────

function FocusNoteEditor({ payload, onChange }) {
  return (
    <div>
      <Label>Focus sentence</Label>
      <TextInput
        value={payload.text}
        onChange={v => onChange({ text: v })}
        placeholder="e.g. Ship the May deck."
      />
    </div>
  );
}

function PriorityEditor({ payload, onChange, allTasks }) {
  const opts = allTasks.map(t => ({
    value: t.id,
    label: `${t.id} [${t.status}] — ${t.title.slice(0, 60)}${t.title.length > 60 ? "…" : ""}`,
  }));
  const task = allTasks.find(t => t.id === payload.task_id);
  return (
    <div>
      <Label>Task</Label>
      <Select
        value={payload.task_id}
        onChange={v => onChange({ task_id: v })}
        options={opts}
        placeholder="(pick a task)"
      />
      {task && (
        <div style={{
          fontSize: "11px", color: "#8E8E93", marginTop: "6px",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {task.wsName} · target: {task.target || "—"}
          {task.subtasks?.length ? ` · ${task.subtasks.filter(s => s.done).length}/${task.subtasks.length} subs` : ""}
        </div>
      )}
    </div>
  );
}

function NewTaskEditor({ payload, onChange, workstreams }) {
  const wsOpts = workstreams.map(w => ({ value: w.id, label: `${w.name} (${w.prefix})` }));
  const typeOpts = Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: `${k} — ${v}` }));

  const updateSub = (idx, updates) => {
    const next = [...(payload.subtasks || [])];
    next[idx] = { ...next[idx], ...updates };
    onChange({ subtasks: next });
  };
  const addSub = () => onChange({ subtasks: [...(payload.subtasks || []), { title: "", dueDate: "" }] });
  const removeSub = (idx) => {
    const next = [...(payload.subtasks || [])];
    next.splice(idx, 1);
    onChange({ subtasks: next });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 2 }}>
          <Label>Workstream</Label>
          <Select value={payload.workstream_id} onChange={v => onChange({ workstream_id: v })} options={wsOpts} />
        </div>
        <div style={{ flex: 1 }}>
          <Label>Type</Label>
          <Select value={payload.type} onChange={v => onChange({ type: v })} options={typeOpts} />
        </div>
      </div>

      <div>
        <Label>Title</Label>
        <TextInput value={payload.title} onChange={v => onChange({ title: v })} placeholder="What needs to get done?" />
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 1 }}>
          <Label>Target / window</Label>
          <TextInput value={payload.target} onChange={v => onChange({ target: v })} placeholder="Mon-Tue" />
        </div>
        <div style={{ flex: 1 }}>
          <Label>Stakeholders (comma-separated)</Label>
          <TextInput
            value={(payload.stakeholders || []).join(", ")}
            onChange={v => onChange({ stakeholders: v.split(",").map(s => s.trim()).filter(Boolean) })}
            placeholder="Brandye, May"
          />
        </div>
      </div>

      <div>
        <Label>Subtasks</Label>
        {(payload.subtasks || []).map((s, i) => (
          <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
            <input
              value={s.title}
              onChange={e => updateSub(i, { title: e.target.value })}
              placeholder="subtask title"
              style={{
                flex: 2, background: "#0D0D0F", color: "#E5E5EA",
                border: "1px solid #2A2A2E", borderRadius: "4px",
                padding: "6px 8px", fontSize: "11px",
                fontFamily: "'DM Sans', sans-serif", outline: "none",
              }}
            />
            <input
              type="date"
              value={s.dueDate || ""}
              onChange={e => updateSub(i, { dueDate: e.target.value })}
              style={{
                flex: 1, background: "#0D0D0F", color: "#8E8E93",
                border: "1px solid #2A2A2E", borderRadius: "4px",
                padding: "6px 8px", fontSize: "11px",
                fontFamily: "'JetBrains Mono', monospace", outline: "none",
              }}
            />
            <button
              onClick={() => removeSub(i)}
              style={{
                background: "transparent", border: "1px solid #2A2A2E", borderRadius: "4px",
                color: "#6E6E73", fontSize: "12px", padding: "0 8px", cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
              }}
              title="Remove"
            >×</button>
          </div>
        ))}
        <button
          onClick={addSub}
          style={{
            background: "transparent", border: "1px dashed #3A3A3E", borderRadius: "4px",
            color: "#6E6E73", fontSize: "10px", padding: "4px 10px",
            fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", marginTop: "2px",
          }}
        >+ subtask</button>
      </div>

      <label style={{
        display: "flex", alignItems: "center", gap: "8px",
        fontSize: "11px", color: "#8E8E93", fontFamily: "'DM Sans', sans-serif",
        cursor: "pointer",
      }}>
        <input
          type="checkbox"
          checked={!!payload.add_to_today}
          onChange={e => onChange({ add_to_today: e.target.checked })}
        />
        Also add to today's plan
      </label>
    </div>
  );
}

function NewSubtaskEditor({ payload, onChange, allTasks }) {
  const opts = allTasks.map(t => ({
    value: t.id,
    label: `${t.id} — ${t.title.slice(0, 60)}${t.title.length > 60 ? "…" : ""}`,
  }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div>
        <Label>Parent task</Label>
        <Select value={payload.task_id} onChange={v => onChange({ task_id: v })} options={opts} placeholder="(pick a task)" />
      </div>
      <div>
        <Label>Title</Label>
        <TextInput value={payload.title} onChange={v => onChange({ title: v })} />
      </div>
      <div>
        <Label>Due date (optional)</Label>
        <input
          type="date"
          value={payload.dueDate || ""}
          onChange={e => onChange({ dueDate: e.target.value })}
          style={{
            background: "#0D0D0F", color: "#E5E5EA",
            border: "1px solid #2A2A2E", borderRadius: "6px",
            padding: "8px 10px", fontSize: "12px",
            fontFamily: "'JetBrains Mono', monospace", outline: "none",
          }}
        />
      </div>
    </div>
  );
}

function NowPinEditor({ payload, onChange, allTasks }) {
  const opts = allTasks
    .filter(t => t.status !== "DONE")
    .map(t => ({ value: t.id, label: `${t.id} — ${t.title.slice(0, 60)}` }));
  return (
    <div>
      <Label>Pin task</Label>
      <Select value={payload.task_id} onChange={v => onChange({ task_id: v })} options={opts} placeholder="(pick a task)" />
    </div>
  );
}

function ContextUpdateEditor({ payload, onChange }) {
  const opts = CONTEXT_SECTIONS.map(s => ({ value: s, label: s }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div>
        <Label>Section</Label>
        <Select value={payload.section} onChange={v => onChange({ section: v })} options={opts} placeholder="(pick a section)" />
      </div>
      <div>
        <Label>Note text</Label>
        <TextInput value={payload.text} onChange={v => onChange({ text: v })} multiline />
      </div>
    </div>
  );
}

// ── Single proposal card ──────────────────────────────────────────

function ProposalCard({ proposal, onAccept, onSkip, onEdit, allTasks, workstreams }) {
  const [expanded, setExpanded] = useState(true);
  const accent = KIND_ACCENTS[proposal.kind] || "#6E6E73";
  const decided = proposal.decision !== "pending";

  const summary = useMemo(() => {
    const p = proposal.payload || {};
    switch (proposal.kind) {
      case "focus_note":
        return p.text ? `"${p.text.slice(0, 80)}${p.text.length > 80 ? "…" : ""}"` : "(empty)";
      case "priority": {
        const t = allTasks.find(x => x.id === p.task_id);
        return t ? `${t.id} — ${t.title}` : `(missing task ${p.task_id})`;
      }
      case "new_task":
        return p.title ? `${p.title}` : "(no title)";
      case "new_subtask": {
        const t = allTasks.find(x => x.id === p.task_id);
        return `${t?.id || p.task_id} ↳ ${p.title || "(no title)"}`;
      }
      case "now_pin": {
        const t = allTasks.find(x => x.id === p.task_id);
        return t ? `${t.id} — ${t.title}` : `(missing task ${p.task_id})`;
      }
      case "context_update":
        return `${p.section || "?"}: ${(p.text || "").slice(0, 60)}${(p.text || "").length > 60 ? "…" : ""}`;
      default:
        return "";
    }
  }, [proposal, allTasks]);

  const editor = (() => {
    const props = { payload: proposal.payload, onChange: onEdit, allTasks, workstreams };
    switch (proposal.kind) {
      case "focus_note": return <FocusNoteEditor {...props} />;
      case "priority": return <PriorityEditor {...props} />;
      case "new_task": return <NewTaskEditor {...props} />;
      case "new_subtask": return <NewSubtaskEditor {...props} />;
      case "now_pin": return <NowPinEditor {...props} />;
      case "context_update": return <ContextUpdateEditor {...props} />;
      default: return <div style={{ color: "#6E6E73", fontSize: "11px" }}>Unknown proposal kind: {proposal.kind}</div>;
    }
  })();

  return (
    <div style={{
      background: decided ? "#161618" : "#1C1C1E",
      border: `1px solid ${decided ? "#222226" : "#2A2A2E"}`,
      borderLeft: `3px solid ${decided ? "#3A3A3E" : accent}`,
      borderRadius: "8px",
      padding: "10px 12px", marginBottom: "8px",
      opacity: decided ? 0.6 : 1,
    }}>
      <div
        onClick={() => !decided && setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          cursor: decided ? "default" : "pointer",
        }}
      >
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
          color: accent, fontWeight: 700, width: "14px",
        }}>{KIND_ICONS[proposal.kind] || "·"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "10px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace",
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>{KIND_LABELS[proposal.kind]}</div>
          <div style={{
            fontSize: "13px", color: "#E5E5EA", fontFamily: "'DM Sans', sans-serif",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            marginTop: "1px",
          }}>{summary}</div>
        </div>
        {decided ? (
          <span style={{
            fontSize: "9px", fontFamily: "'JetBrains Mono', monospace",
            color: proposal.decision === "accepted" ? "#6CC4A1" : "#E85B5B",
            padding: "2px 6px", borderRadius: "3px",
            background: proposal.decision === "accepted" ? "#1A2A1A" : "#2A1A1A",
            border: `1px solid ${proposal.decision === "accepted" ? "#2A4A2A" : "#4A2A2A"}`,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>{proposal.decision === "accepted" ? "✓ accepted" : "× skipped"}</span>
        ) : (
          <span style={{
            color: "#4A4A4E", fontSize: "10px",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}>▶</span>
        )}
      </div>

      {!decided && expanded && (
        <>
          {proposal.reason && (
            <div style={{
              marginTop: "10px", padding: "8px 10px",
              background: "#0D0D0F", borderRadius: "6px",
              fontSize: "11px", color: "#8E8E93", lineHeight: 1.5,
              fontFamily: "'DM Sans', sans-serif", fontStyle: "italic",
              borderLeft: `2px solid ${accent}66`,
            }}>
              <span style={{ color: "#6E6E73", fontStyle: "normal", fontSize: "9px", letterSpacing: "0.5px", textTransform: "uppercase", marginRight: "6px" }}>why</span>
              {proposal.reason}
            </div>
          )}
          <div style={{ marginTop: "10px" }}>{editor}</div>
          <div style={{
            display: "flex", gap: "6px", marginTop: "12px", justifyContent: "flex-end",
          }}>
            <button
              onClick={() => onSkip(proposal.id)}
              style={{
                background: "transparent", border: "1px solid #2A2A2E", borderRadius: "4px",
                color: "#8E8E93", fontSize: "11px", padding: "5px 12px",
                fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
              }}
            >skip</button>
            <button
              onClick={() => onAccept(proposal.id)}
              style={{
                background: accent, border: "none", borderRadius: "4px",
                color: "#0D0D0F", fontSize: "11px", padding: "5px 14px", fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
              }}
            >accept →</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function MorningIntake({
  intake, data, onAcceptProposal, onSkipProposal, onEditProposal,
  onFinish, onSkipIntake, onIterate, onOpenAgent,
}) {
  const allTasks = useMemo(
    () => data.workstreams.flatMap(ws => ws.tasks.map(t => ({ ...t, wsName: ws.name, wsId: ws.id }))),
    [data.workstreams]
  );

  if (!intake || intake.status === "done" || intake.status === "skipped") return null;

  const proposals = intake.proposals || [];
  const pending = proposals.filter(p => p.decision === "pending");
  const decided = proposals.filter(p => p.decision !== "pending");
  const isActive = intake.status === "active";
  const isReviewing = intake.status === "reviewing";

  return (
    <div style={{
      background: "linear-gradient(180deg, #1F1B12 0%, #18181B 100%)",
      border: "1px solid #4A3A18",
      borderRadius: "12px",
      padding: "16px 18px", marginBottom: "16px",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "10px",
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 700,
          color: "#E8A838", letterSpacing: "1px", textTransform: "uppercase",
        }}>☀ Morning Intake</span>
        {isActive && (
          <span className="agent-thinking" style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
            color: "#8E8E93",
          }}>agent is asking questions in the chat panel…</span>
        )}
        {isReviewing && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
            color: "#6CC4A1",
          }}>{pending.length} item{pending.length === 1 ? "" : "s"} to review · {decided.length} decided</span>
        )}
        <div style={{ flex: 1 }} />
        {isActive && (
          <button
            onClick={onOpenAgent}
            style={{
              background: "transparent", border: "1px solid #4A3A18", borderRadius: "4px",
              color: "#E8A838", fontSize: "10px", padding: "3px 10px",
              fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
            }}
          >open chat →</button>
        )}
        <button
          onClick={onSkipIntake}
          title="Skip intake for today"
          style={{
            background: "transparent", border: "1px solid #2A2A2E", borderRadius: "4px",
            color: "#6E6E73", fontSize: "10px", padding: "3px 10px",
            fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
          }}
        >skip for today</button>
      </div>

      {/* Summary */}
      {intake.summary && isReviewing && (
        <div style={{
          fontSize: "12px", color: "#C5C5CA", lineHeight: 1.5,
          fontFamily: "'DM Sans', sans-serif",
          marginBottom: "12px",
          padding: "8px 12px", background: "#0D0D0F", borderRadius: "6px",
          borderLeft: "2px solid #E8A838",
        }}>{intake.summary}</div>
      )}

      {/* Proposals */}
      {isReviewing && proposals.length > 0 && (
        <div>
          {proposals.map(p => (
            <ProposalCard
              key={p.id}
              proposal={p}
              onAccept={onAcceptProposal}
              onSkip={onSkipProposal}
              onEdit={(updates) => onEditProposal(p.id, updates)}
              allTasks={allTasks}
              workstreams={data.workstreams}
            />
          ))}
        </div>
      )}

      {/* Active state — no proposals yet */}
      {isActive && (
        <div style={{
          padding: "16px 12px", textAlign: "center",
          color: "#8E8E93", fontSize: "12px",
          fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6,
        }}>
          The agent is gathering context to plan your day.<br />
          <span style={{ color: "#6E6E73", fontSize: "11px" }}>
            Reply in the chat panel. When ready, the agent will propose specific actions to review here.
          </span>
        </div>
      )}

      {/* Footer actions */}
      {isReviewing && (
        <div style={{
          display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap",
          paddingTop: "12px", borderTop: "1px dashed #2A2A2E",
        }}>
          <button
            onClick={onIterate}
            style={{
              background: "transparent", border: "1px solid #2A2A2E", borderRadius: "6px",
              color: "#8E8E93", fontSize: "11px", padding: "6px 12px",
              fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
            }}
          >↺ discuss further</button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onFinish}
            disabled={pending.length > 0}
            title={pending.length > 0 ? "Decide on all proposals first" : "Finish morning intake"}
            style={{
              background: pending.length === 0 ? "#6CC4A1" : "#2A2A2E",
              border: "none", borderRadius: "6px",
              color: pending.length === 0 ? "#0D0D0F" : "#4A4A4E",
              fontSize: "11px", padding: "6px 16px", fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: pending.length === 0 ? "pointer" : "default",
            }}
          >✓ finish intake</button>
        </div>
      )}
    </div>
  );
}
