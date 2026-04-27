// ── Agent (Claude tool-use) ───────────────────────────────────────
//
// We use Anthropic's tool-use API rather than asking the model to
// emit raw JSON. That gives us:
//   * Schema validation server-side (bad calls are caught before
//     we ever see them).
//   * Optional reasoning text in the same response.
//   * Cleaner debuggability — each action is a discrete tool_use
//     content block.
//
// The agent never sees the full tracker JSON. Instead the system
// prompt embeds a *digest* (active tasks only, today plan resolved
// to titles, recent daily logs, etc.) plus a "Recent feedback
// signals" block derived from agent history (undone actions,
// stalled tasks, plan rollovers).

// ── Tool definitions ───────────────────────────────────────────────

export const AGENT_TOOLS = [
  {
    name: "add_task",
    description: "Create a new task in a workstream.",
    input_schema: {
      type: "object",
      properties: {
        workstream_id: { type: "string", description: "Target workstream id (e.g. 'seg')" },
        task: {
          type: "object",
          properties: {
            id: { type: "string", description: "PREFIX-NUMBER, e.g. 'SEG-11'" },
            type: { type: "string", enum: ["N", "D", "A", "--"] },
            title: { type: "string" },
            status: { type: "string", enum: ["NOT STARTED", "IN PROGRESS", "WAITING", "DONE"] },
            target: { type: "string", description: "Target date or window, e.g. 'Mon-Tue'" },
            stakeholders: { type: "array", items: { type: "string" } },
          },
          required: ["id", "type", "title", "status"],
        },
      },
      required: ["workstream_id", "task"],
    },
  },
  {
    name: "update_task",
    description: "Update fields on an existing task.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        updates: {
          type: "object",
          description: "Partial task fields to merge. May include status, title, target, stakeholders.",
        },
      },
      required: ["task_id", "updates"],
    },
  },
  {
    name: "delete_task",
    description: "Permanently delete a task.",
    input_schema: {
      type: "object",
      properties: { task_id: { type: "string" } },
      required: ["task_id"],
    },
  },
  {
    name: "add_subtask",
    description: "Append a subtask to a task. Subtask id is auto-generated.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        title: { type: "string" },
        dueDate: { type: "string", description: "Optional YYYY-MM-DD" },
      },
      required: ["task_id", "title"],
    },
  },
  {
    name: "toggle_subtask",
    description: "Flip a subtask between done/not-done. completedAt is set automatically.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        subtask_id: { type: "string" },
      },
      required: ["task_id", "subtask_id"],
    },
  },
  {
    name: "delete_subtask",
    description: "Remove a subtask.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        subtask_id: { type: "string" },
      },
      required: ["task_id", "subtask_id"],
    },
  },
  {
    name: "update_subtask",
    description: "Update fields on a subtask. Use for backfilling completedAt or changing title/dueDate.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        subtask_id: { type: "string" },
        updates: { type: "object" },
      },
      required: ["task_id", "subtask_id", "updates"],
    },
  },
  {
    name: "add_document",
    description: "Attach a document link (Google Doc, spreadsheet, etc.) to a task.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        document: {
          type: "object",
          properties: {
            id: { type: "string", description: "doc-N format" },
            label: { type: "string" },
            url: { type: "string" },
            subtask_ids: { type: "array", items: { type: "string" } },
          },
          required: ["id", "label", "url"],
        },
      },
      required: ["task_id", "document"],
    },
  },
  {
    name: "update_document",
    description: "Update a document's label, url, or linked subtasks.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        document_id: { type: "string" },
        updates: { type: "object" },
      },
      required: ["task_id", "document_id", "updates"],
    },
  },
  {
    name: "delete_document",
    description: "Remove a document from a task.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        document_id: { type: "string" },
      },
      required: ["task_id", "document_id"],
    },
  },
  {
    name: "add_note",
    description: "Add a Quick Note to the tracker.",
    input_schema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
  {
    name: "add_workstream",
    description: "Create a new workstream. Pick a short lowercase id, uppercase prefix, and a hex color that doesn't clash.",
    input_schema: {
      type: "object",
      properties: {
        workstream: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            prefix: { type: "string" },
            color: { type: "string" },
            description: { type: "string" },
          },
          required: ["id", "name", "prefix", "color"],
        },
      },
      required: ["workstream"],
    },
  },
  {
    name: "update_workstream",
    description: "Update a workstream's name, color, description, or prefix.",
    input_schema: {
      type: "object",
      properties: {
        workstream_id: { type: "string" },
        updates: { type: "object" },
      },
      required: ["workstream_id", "updates"],
    },
  },
  {
    name: "delete_workstream",
    description: "Delete a workstream and all its tasks.",
    input_schema: {
      type: "object",
      properties: { workstream_id: { type: "string" } },
      required: ["workstream_id"],
    },
  },
  {
    name: "reorder_workstreams",
    description: "Set workstream display order. Pass the full ordered list of ids.",
    input_schema: {
      type: "object",
      properties: { order: { type: "array", items: { type: "string" } } },
      required: ["order"],
    },
  },
  {
    name: "set_today_plan",
    description: "Set today's priority queue. Pass an ordered list of task ids and an optional one-line focus note.",
    input_schema: {
      type: "object",
      properties: {
        taskIds: { type: "array", items: { type: "string" } },
        userNote: { type: "string" },
      },
      required: ["taskIds"],
    },
  },
  {
    name: "set_today_log",
    description: "Write or replace today's daily log (a concise summary of progress, completed work, blockers).",
    input_schema: {
      type: "object",
      properties: { log: { type: "string" } },
      required: ["log"],
    },
  },
  {
    name: "update_context_section",
    description:
      "Save important durable context to a named section of Mark's briefing document. " +
      "Use this for people, preferences, project facts, political dynamics — anything you'd want to remember across sessions. " +
      "Prefer existing section names: 'People', 'Preferences', 'Project: Segmentation', 'Project: Staples', 'Recent Decisions', 'Working Style'. " +
      "Mode 'append' (default) adds to the end of the section; 'replace' overwrites it (use sparingly).",
    input_schema: {
      type: "object",
      properties: {
        section: { type: "string", description: "Section heading (without the leading ##)" },
        text: { type: "string" },
        mode: { type: "string", enum: ["append", "replace"] },
      },
      required: ["section", "text"],
    },
  },
  {
    name: "update_context",
    description:
      "DEPRECATED — prefer update_context_section. Appends a dated note to the bottom of the context doc.",
    input_schema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
  {
    name: "set_now_pin",
    description: "Pin the single task Mark is actively working on. Surfaces across views as a 'NOW' indicator.",
    input_schema: {
      type: "object",
      properties: { task_id: { type: "string" } },
      required: ["task_id"],
    },
  },
  {
    name: "clear_now_pin",
    description: "Unpin the currently active task.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "set_weekly_retro",
    description:
      "Save a weekly retrospective. Use when generating a Sunday retro or when Mark asks for one. " +
      "weekKey is the ISO date (YYYY-MM-DD) of that week's Monday.",
    input_schema: {
      type: "object",
      properties: {
        weekKey: { type: "string" },
        retro: {
          type: "object",
          properties: {
            summary: { type: "string", description: "2–3 sentence overview of the week" },
            wins: { type: "array", items: { type: "string" } },
            carryover: { type: "array", items: { type: "string" }, description: "Task ids or themes carrying into next week" },
            decisions: { type: "array", items: { type: "string" } },
            nextWeekFocus: { type: "string", description: "One-line suggested focus for the upcoming week" },
          },
          required: ["summary"],
        },
      },
      required: ["weekKey", "retro"],
    },
  },
  {
    name: "propose_morning_plan",
    description:
      "Propose a complete morning plan for Mark to review one item at a time. " +
      "Call this EXACTLY ONCE at the end of morning intake when you have enough context. " +
      "Do NOT call any other mutation tools (add_task, set_today_plan, etc.) while in morning intake mode. " +
      "Each item Mark sees as a separate card he can edit, accept, or skip. " +
      "If Mark pushes back after seeing the proposal, gather more context and call this tool AGAIN with a revised plan.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "1-2 sentence narrative of the day's shape" },
        focus_note: { type: "string", description: "One-line focus sentence for today (optional)" },
        priorities: {
          type: "array",
          description: "Existing tasks to put on today's plan, in order of priority.",
          items: {
            type: "object",
            properties: {
              task_id: { type: "string" },
              reason: { type: "string", description: "1-line why this is on today's plan" },
            },
            required: ["task_id"],
          },
        },
        new_tasks: {
          type: "array",
          description: "Brand-new tasks to create. Mark will edit fields before accepting.",
          items: {
            type: "object",
            properties: {
              workstream_id: { type: "string" },
              id: { type: "string", description: "Optional — auto-generated if omitted" },
              type: { type: "string", enum: ["N", "D", "A", "--"] },
              title: { type: "string" },
              target: { type: "string" },
              stakeholders: { type: "array", items: { type: "string" } },
              subtasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: { title: { type: "string" }, dueDate: { type: "string" } },
                  required: ["title"],
                },
              },
              add_to_today: { type: "boolean", description: "Default true — also add to today's plan when accepted" },
              reason: { type: "string" },
            },
            required: ["workstream_id", "title"],
          },
        },
        new_subtasks: {
          type: "array",
          description: "Subtasks to add to existing tasks.",
          items: {
            type: "object",
            properties: {
              task_id: { type: "string" },
              title: { type: "string" },
              dueDate: { type: "string" },
              reason: { type: "string" },
            },
            required: ["task_id", "title"],
          },
        },
        now_pin_task_id: { type: "string", description: "Optional task to pin as 'now working on'" },
        context_updates: {
          type: "array",
          description: "Durable context worth saving to the briefing doc (people, decisions, preferences).",
          items: {
            type: "object",
            properties: { section: { type: "string" }, text: { type: "string" } },
            required: ["section", "text"],
          },
        },
      },
    },
  },
  {
    name: "draft_tomorrow_plan",
    description:
      "Draft (but do NOT apply) tomorrow's priority list. Used by the End-of-Day flow. " +
      "Mark reviews and accepts/edits the draft. Use set_today_plan if Mark asks you to set today directly.",
    input_schema: {
      type: "object",
      properties: {
        taskIds: { type: "array", items: { type: "string" } },
        userNote: { type: "string" },
      },
      required: ["taskIds"],
    },
  },
];

// ── State digest ───────────────────────────────────────────────────
//
// Compresses tracker state into a compact text view the model can
// reason over without burning tokens on archived/done detail.

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function fmtDays(ms) {
  const d = Math.round(ms / (24 * 60 * 60 * 1000));
  if (d <= 0) return "today";
  if (d === 1) return "1 day";
  return `${d} days`;
}

export function digestTrackerState(data) {
  const lines = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`Week: ${data.weekLabel || "(none)"}`);
  lines.push(`Today: ${today}`);

  // Today plan, resolved to titles
  const allTasks = data.workstreams.flatMap(w => w.tasks.map(t => ({ ...t, wsId: w.id, wsName: w.name })));
  const taskById = Object.fromEntries(allTasks.map(t => [t.id, t]));

  // Now-pin
  if (data.nowPinTaskId) {
    const t = taskById[data.nowPinTaskId];
    if (t) {
      lines.push("");
      lines.push(`▶ Mark is actively working on: ${t.id} — ${t.title} [${t.status}]`);
    }
  }

  // Tomorrow draft (if any)
  if (data.tomorrowDraft?.taskIds?.length) {
    const ids = data.tomorrowDraft.taskIds.map(id => taskById[id]?.id).filter(Boolean).join(", ");
    lines.push("");
    lines.push(`Drafted plan for tomorrow (not yet applied): ${ids}${data.tomorrowDraft.userNote ? ` — ${data.tomorrowDraft.userNote}` : ""}`);
  }
  const plan = data.todayPlan || {};
  if (plan.taskIds && plan.taskIds.length > 0) {
    lines.push("");
    lines.push(`Today plan${plan.userNote ? ` — focus: "${plan.userNote}"` : ""}:`);
    plan.taskIds.forEach((id, i) => {
      const t = taskById[id];
      if (!t) return;
      lines.push(`  ${i + 1}. [${t.status}] ${t.id} — ${t.title}`);
    });
  } else {
    lines.push("");
    lines.push(`Today plan: (empty)${plan.userNote ? ` focus: "${plan.userNote}"` : ""}`);
  }

  // Active workstreams (skip empty / fully-done)
  lines.push("");
  lines.push("Workstreams (active tasks only):");
  for (const ws of data.workstreams) {
    const active = ws.tasks.filter(t => t.status !== "DONE");
    const doneCount = ws.tasks.length - active.length;
    if (active.length === 0 && doneCount === 0) continue;
    lines.push(`- ${ws.name} (${ws.id}, prefix ${ws.prefix}) — ${active.length} active, ${doneCount} done`);
    for (const t of active) {
      const subs = t.subtasks || [];
      const subStr = subs.length > 0 ? ` [${subs.filter(s => s.done).length}/${subs.length}]` : "";
      const stakeStr = t.stakeholders?.length ? ` {${t.stakeholders.join(",")}}` : "";
      lines.push(`  ${t.id} [${t.status}] (${t.type}, ${t.target || "?"})${subStr}${stakeStr} — ${t.title}`);
      // Include open subtasks with due-date urgency
      const openSubs = subs.filter(s => !s.done);
      for (const s of openSubs.slice(0, 5)) {
        let dueTag = "";
        if (s.dueDate) {
          const ms = new Date(s.dueDate + "T23:59:59").getTime() - Date.now();
          if (ms < 0) dueTag = ` ⚠OVERDUE(${s.dueDate})`;
          else if (ms < 2 * 24 * 60 * 60 * 1000) dueTag = ` ⏰DUE(${s.dueDate})`;
          else dueTag = ` (due ${s.dueDate})`;
        }
        lines.push(`    ${s.id}: ${s.title}${dueTag}`);
      }
      if (openSubs.length > 5) lines.push(`    … +${openSubs.length - 5} more open subtasks`);
    }
  }

  // Recent daily logs (last 3 days that have logs)
  if (data.dailyLogs) {
    const dates = Object.keys(data.dailyLogs).sort().slice(-3);
    if (dates.length > 0) {
      lines.push("");
      lines.push("Recent daily logs:");
      for (const date of dates) {
        const e = data.dailyLogs[date];
        if (!e) continue;
        const summary = (e.log || "").trim().split("\n").slice(0, 2).join(" ").slice(0, 200);
        lines.push(`- ${date}: ${summary || "(no log)"} — ${e.taskIds?.length || 0} tasks${e.userNote ? `, focus: "${e.userNote}"` : ""}`);
      }
    }
  }

  // Recent quick notes (last 5)
  if (data.notes && data.notes.length > 0) {
    lines.push("");
    lines.push("Recent quick notes:");
    for (const n of data.notes.slice(0, 5)) {
      const ts = n.ts ? new Date(n.ts).toISOString().slice(0, 10) : "?";
      lines.push(`- ${ts}: ${n.text}`);
    }
  }

  return lines.join("\n");
}

// ── Feedback signals ───────────────────────────────────────────────
//
// Telemetry the agent should see: which of its actions were undone,
// which tasks have been stuck on the daily plan day after day, which
// tasks have been WAITING for a long time.

export function buildFeedbackSignals(data, recentHistory) {
  const lines = [];

  // Undone-action signals from agent history
  const undoneAssistantMsgs = (recentHistory || []).filter(m => m.role === "assistant" && m.undone);
  if (undoneAssistantMsgs.length > 0) {
    lines.push("Recently undone agent actions (Mark rolled these back — try a different approach):");
    for (const m of undoneAssistantMsgs.slice(-3)) {
      const labels = (m.actions || []).map(a => a.type).filter(Boolean).join(", ");
      lines.push(`- "${(m.content || "").slice(0, 100)}" [${labels}]`);
    }
  }

  // Today-plan rollover detection: tasks present on today's plan AND
  // on prior daily logs but never marked DONE.
  const plan = data.todayPlan || {};
  const allTasks = data.workstreams.flatMap(w => w.tasks);
  const taskById = Object.fromEntries(allTasks.map(t => [t.id, t]));

  if (data.dailyLogs && plan.taskIds?.length > 0) {
    const dailyDates = Object.keys(data.dailyLogs).sort();
    const rollovers = [];
    for (const id of plan.taskIds) {
      let count = 0;
      for (const d of dailyDates) {
        if (data.dailyLogs[d]?.taskIds?.includes(id)) count++;
      }
      if (count >= 2 && taskById[id] && taskById[id].status !== "DONE") {
        rollovers.push({ id, days: count + 1, title: taskById[id].title });
      }
    }
    if (rollovers.length > 0) {
      lines.push("");
      lines.push("Tasks rolling over on the daily plan (consider why these aren't getting done):");
      for (const r of rollovers) lines.push(`- ${r.id} (${r.days} days in queue): ${r.title}`);
    }
  }

  // Long-WAITING tasks (we don't track when status changed, so this is a heuristic
  // based on lastUpdated of the whole tracker — only flag if data has been around).
  // Better: any WAITING task with subtasks all completed, or with explicit hints.
  const longWaiting = allTasks.filter(t => t.status === "WAITING");
  if (longWaiting.length > 0) {
    lines.push("");
    lines.push(`${longWaiting.length} task(s) currently WAITING — may need a nudge:`);
    for (const t of longWaiting.slice(0, 5)) {
      lines.push(`- ${t.id}: ${t.title}${t.stakeholders?.length ? ` (waiting on: ${t.stakeholders.join(", ")})` : ""}`);
    }
  }

  // Stalled completion: workstreams where last-completed subtask is >7d ago but task still active
  const stale = [];
  for (const t of allTasks) {
    if (t.status === "DONE") continue;
    const subs = t.subtasks || [];
    if (subs.length === 0) continue;
    const lastCompletedAt = subs.filter(s => s.completedAt).map(s => new Date(s.completedAt).getTime()).sort().pop();
    if (lastCompletedAt && Date.now() - lastCompletedAt > SEVEN_DAYS && subs.some(s => !s.done)) {
      stale.push({ id: t.id, title: t.title, since: fmtDays(Date.now() - lastCompletedAt) });
    }
  }
  if (stale.length > 0) {
    lines.push("");
    lines.push("Tasks with no subtask progress in 7+ days:");
    for (const s of stale.slice(0, 5)) lines.push(`- ${s.id} (last subtask done ${s.since} ago): ${s.title}`);
  }

  return lines.length > 0 ? lines.join("\n") : "(no notable signals)";
}

// ── System prompt ──────────────────────────────────────────────────

const MORNING_INTAKE_BLOCK = `## MORNING INTAKE MODE — ACTIVE

You are doing morning intake with Mark. Goal: in 1-3 short exchanges, understand what today should look like.

Rules while in this mode:
1. DO NOT call any mutation tools (add_task, set_today_plan, set_now_pin, add_subtask, etc.). The ONE tool you may call is \`propose_morning_plan\`.
2. Be conversational, brief, and focused. Ask follow-up questions ONE AT A TIME, not laundry lists.
3. Use the digest + feedback signals below to ground your questions — show you've read them. Don't ask about things you already know.
4. Open with a brief greeting that already references concrete context (e.g. yesterday's blockers, rolled-over tasks, items WAITING on stakeholders, due dates this week). Then ask one focused question.
5. Examples of good first questions: "Yesterday SEG-3 didn't move — still stuck on the May framing, or has that resolved?" / "Brandye still hasn't responded on SEG-4a — chase today or move on?" / "What's the must-finish item before tomorrow's meeting?"
6. After you have enough context (typically 1-3 turns), call \`propose_morning_plan\` ONCE with a structured plan. Mark reviews each item individually.
7. If Mark says "redo", "iterate", or pushes back after seeing the proposal, ask one clarifying question, then call \`propose_morning_plan\` AGAIN with a revised plan. Don't call other tools.
8. Keep proposals concrete and grounded in the digest — use real task ids, real workstream ids.
`;

export const buildSystemPrompt = (data, contextDoc, recentHistory, historyLength, mode = "normal") => {
  const digest = digestTrackerState(data);
  const signals = buildFeedbackSignals(data, recentHistory);
  const longConvWarning = historyLength >= 24
    ? `\n\n## LONG CONVERSATION\nThis chat has ${historyLength} messages. If durable context has surfaced that isn't in the briefing yet, save it now via update_context_section before it's lost.`
    : "";
  const modeBlock = mode === "morning_intake" ? `\n${MORNING_INTAKE_BLOCK}\n` : "";

  return `You are Mark's embedded work-tracker agent — a daily-driver for task management AND a strategic thought partner. You have deep context about his role, team, and current priorities.${modeBlock}

## TOP-LEVEL RULES (in order)
1. Be concise and direct. Mark values clarity over verbosity.
2. When Mark asks you to change tracker state, USE TOOLS — don't just describe what you'd do.
3. When durable context surfaces (people, preferences, dynamics, project facts), capture it via update_context_section so you'll have it next session.
4. When you reason about prioritization, reference specific task ids and the political/strategic context.
5. Watch the feedback-signals block: if your last suggestion was undone, take a different angle.

## BRIEFING DOCUMENT
${contextDoc}

## TASK MODEL
- Statuses: NOT STARTED | IN PROGRESS | WAITING | DONE
- Types: N=Narrative, D=Data/SQL, A=Advisory, --=Misc
- Subtask ids = parent id + letter suffix (e.g. SEG-5a). The app auto-flips parent status: parent → DONE when all subs done; parent → IN PROGRESS when any sub is reopened or added to a DONE task. Don't fight this.
- completedAt is set by the app when toggling. Only set it manually when backfilling legacy subtasks.
- dueDate (subtasks) = optional YYYY-MM-DD. UI highlights yellow within 2 days, red when overdue.

## DIGEST OF CURRENT STATE
${digest}

## RECENT FEEDBACK SIGNALS
${signals}

## TRIAGE BEHAVIOR
- Morning planning is handled by Morning Intake (conversational, in-app review of proposals). When intake is active you're in MORNING INTAKE MODE; otherwise treat any explicit "triage" / "what should I work on today?" as a direct request and call set_today_plan with an ordered list of task ids and a one-line userNote naming the focus (3–7 tasks; weigh due dates, meeting prep, dependencies, rollover patterns).
- "Today I just need to finish X" → set_today_plan with just those tasks.
- "Summarize my day" / "wrap up" → call set_today_log with completed work, progress, blockers.
- "End of day" / "draft tomorrow" → call set_today_log AND draft_tomorrow_plan (don't apply set_today_plan — Mark reviews the draft first).
- "I'm working on X now" / "focus on X" → call set_now_pin with that task. Clear with clear_now_pin when Mark is done or moves on.
- "Weekly retro" / Sunday session → call set_weekly_retro with a structured retrospective for the week that just ended. weekKey is the ISO date of that week's Monday.

## CONTEXT-DOC SECTIONS
Prefer these section names when calling update_context_section:
- People — facts about teammates / stakeholders
- Preferences — Mark's working preferences, communication style
- Project: Segmentation / Project: Staples / Project: Horizontal — durable project facts
- Recent Decisions — choices made that should be remembered
- Working Style — meta-notes on how Mark wants you to operate${longConvWarning}

## RESPONSE STYLE
Reply with a short conversational message (rendered as markdown to Mark) AND any tool calls needed to apply changes. The message should explain what you did or what you'd like to clarify; the tools do the actual mutation. Don't restate tool inputs in the message text — Mark sees a compact action chip per tool call.`;
};

// ── API call ───────────────────────────────────────────────────────

export const AGENT_MODELS = {
  sonnet: { id: "claude-sonnet-4-20250514", label: "Sonnet", inputCostPer1K: 0.003, outputCostPer1K: 0.015 },
  haiku: { id: "claude-haiku-4-5-20251001", label: "Haiku", inputCostPer1K: 0.0008, outputCostPer1K: 0.004 },
};

// Strip tool_use blocks from history before sending back. Anthropic
// requires assistant tool_use to be paired with user tool_result; we
// don't model tool_results because we apply actions ourselves and
// don't loop back to the model. So we feed back text-only history.
function sanitizeHistory(messages) {
  return messages.map(m => {
    if (m.role === "user") {
      return { role: "user", content: m.content };
    }
    // assistant: prefer the conversational text; suffix with action tags so
    // the model has a record of what it did last turn.
    const text = m.content || "";
    const actionTags = (m.actions || []).map(a => a.type).filter(Boolean);
    const undoneTag = m.undone ? " [Mark UNDID this turn]" : "";
    const suffix = actionTags.length > 0 ? `\n\n[Applied: ${actionTags.join(", ")}]${undoneTag}` : undoneTag;
    return { role: "assistant", content: text + suffix };
  }).filter(m => (m.content || "").trim().length > 0);
}

export async function callAgent(history, data, contextDoc, historyLength, modelKey = "sonnet", mode = "normal") {
  const model = AGENT_MODELS[modelKey]?.id || AGENT_MODELS.sonnet.id;
  const sanitized = sanitizeHistory(history);

  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system: buildSystemPrompt(data, contextDoc, history, historyLength, mode),
      tools: AGENT_TOOLS,
      messages: sanitized,
    }),
  });

  const result = await response.json();

  // Surface Anthropic-side errors as a visible assistant message
  // rather than silently dropping them.
  if (result.type === "error" || result.error) {
    const msg = result.error?.message || "Anthropic API error";
    return {
      parsed: { message: `⚠ ${msg}`, actions: [] },
      rawJson: JSON.stringify(result),
      usage: null,
    };
  }

  const blocks = Array.isArray(result.content) ? result.content : [];
  const textBlocks = blocks.filter(b => b.type === "text").map(b => b.text || "").join("\n").trim();
  const toolUses = blocks.filter(b => b.type === "tool_use");

  const actions = toolUses.map(b => ({ type: b.name, ...(b.input || {}) }));
  const message = textBlocks || (actions.length > 0 ? "Done." : "(no response)");

  return {
    parsed: { message, actions },
    rawJson: JSON.stringify(blocks),
    usage: result.usage || null,
  };
}
