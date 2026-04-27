# ⬡ WORKPLAN — Roadmap & Feature Tracker

**Last updated:** Apr 27, 2026 | Stack: Vite + React + Supabase + Netlify Functions

---

## Releases

### v0.8.0 — Apr 27, 2026 — Conversational Morning Intake
- **Conversational morning intake** (FEA-39) — Replaces the v0.7.0 silent auto-triage (FEA-33). On first app load each day with no plan yet, the agent auto-opens the chat panel and starts a 1–3 turn conversation grounded in the digest + feedback signals (rolled-over tasks, WAITING items, due-date pressure, yesterday's log) to understand what today should look like. When ready, it calls a single new tool `propose_morning_plan` that surfaces a structured plan in a new "Morning Intake" panel at the top of the Today view.
  - **Per-action cards with inline editing.** Each proposal (set focus, add to today, create new task, add subtask, set now-pin, save context note) gets its own editable card. You can change the task, edit task fields (workstream, type, title, target, stakeholders, subtasks with due dates), tweak the focus sentence, or rewrite a context note before accepting.
  - **Per-card accept / skip.** Decide on each item independently. Decisions persist; if you reload, you resume exactly where you left off.
  - **Iterate flow.** A "↺ discuss further" button reopens the chat so you can push back ("drop SEG-3, add a working session for the deck"); the agent revises and re-proposes. Already-decided items stay decided; new pending items are added to the queue.
  - **Skip / resume.** "Skip for today" cancels intake without re-prompting until tomorrow. State is preserved across reloads (`morningIntake[date]` keyed in tracker state).
  - **Mode-aware system prompt.** New `MORNING INTAKE MODE` block instructs the agent to ask one focused question at a time, ground in concrete current context (no laundry lists), and call only `propose_morning_plan` while in this mode.
  - **Agent panel updates.** Intake mode shows a `☀ INTAKE` badge in the panel header; kickoff trigger message is hidden from chat (user just sees the agent's greeting); empty-state placeholder reflects intake state.

### v0.7.0 — Apr 26, 2026 — Agent Intelligence + Today/Week Redesign
- **Bidirectional task-status normalization** (FIX-02) — Adding a subtask to a DONE task or unchecking the only-done subtask now flips parent → IN PROGRESS automatically. Centralized in `normalizeTaskStatus()` and applied to every mutation path so manual edits and agent actions stay consistent.
- **Pure mutation library** (INF-07) — All tracker state changes go through `src/lib/mutations.js`. Manual UI handlers and the agent's `applyAgentAction` dispatcher share one implementation. ~230 lines of duplicated logic in `App.jsx` collapsed into a thin shim.
- **Agent on Anthropic tool-use API** (FEA-30) — Replaced post-hoc JSON parsing with Claude's tool-use API. 22 typed tool schemas validated server-side. Anthropic API errors surface as `⚠`-prefixed assistant messages instead of empty responses.
- **Pre-digested state + feedback signals** (FEA-31) — System prompt no longer dumps full tracker JSON. Compact digest (active tasks only, today plan resolved to titles, recent daily logs) plus a "feedback signals" block: undone-action telemetry, plan rollovers, long-WAITING tasks, stalled subtask progress. Undo now tags the assistant message with `undone: true` so the agent sees what you rolled back next turn.
- **Sectioned context doc** (FEA-32) — Default briefing reorganized into named sections (`## People`, `## Project: Segmentation`, `## Working Style`, `## Preferences`, `## Recent Decisions`). New `update_context_section` tool appends to (or creates) named sections instead of dumping a growing list of dated notes.
- **Morning auto-triage** (FEA-33) — On first Today-view mount each day with no plan yet, the agent automatically generates and applies a priority list. Fires once per day; banner indicator while generating; flag persisted in `todayPlan.autoTriaged` to survive crashes. *(Superseded by FEA-39 conversational intake in v0.8.0.)*
- **Today view redesign** (FEA-34) — (A) Card-callout focus block tinted with the workstream color of the pinned/top task. (B) Day rail at the top with click-to-scrub history mode (read-only view of any past day's plan, focus, log, priority queue, with snapshots reconstructing deleted tasks). Stat tiles: done/total, in-progress, overdue subs, due-soon. Stalled-task nudges with one-tap "ask agent →" prompts. Condensed priority queue rows (id, type icon, title, mini progress bar, urgency badge, status pill) that expand inline to full TaskRow.
- **Now-pin** (FEA-35) — `nowPinTaskId` tracks the single task you're actively working on. Surfaces as a slim global indicator in the Header across all views. Tap a priority-queue badge to pin; agent can `set_now_pin` / `clear_now_pin`.
- **Weekly Retro tab** (FEA-13) — New "Retro" top-level tab. Agent-generated structured retros: summary, wins, carryover, decisions, next-week focus. Per-week chips. Sunday/Monday CTA banner. One-shot Sunday auto-trigger drafts last week's retro in the background per session.
- **End-of-day flow + tomorrow draft** (FEA-36) — End-of-day button asks the agent to write today's log AND draft tomorrow's priorities (without applying via `draft_tomorrow_plan`). Next-morning landing shows an "agent-drafted plan" banner with accept / dismiss controls.
- **Richer daily activity in Week tab** (FEA-37) — Daily log section shows per-task completion icons (✓◇⏸○), workstream-color accents, and a per-day status breakdown. Snapshots `taskStatusSnap` / `taskTitleSnap` on daily reset so deleted tasks remain visible in history.

### v0.6.1 — Apr 7, 2026
- **Priority queue formatting** (FEA-26) — Numbered priority badges with workstream accent color, left color bar per task for visual grouping, separator lines between tasks for better readability.
- **Daily log** (FEA-27) — New "Daily Log" card in Today view — click-to-edit journal section. New `set_today_log` agent action: ask the agent to "summarize my day" and it writes a concise log of completed tasks, progress, and blockers. Log persists in `todayPlan.log`.
- **Daily log history** (FEA-28) — Previous days' plans auto-snapshot into `dailyLogs` on daily reset. Week tab shows collapsible daily log entries for the current week (date, focus, log text, task count).

### v0.6.0 — Apr 6, 2026
- **Today View** (FEA-25) — New "Today" tab (default view) for daily triage and planning. Includes editable focus note, inline AI triage input (ask "what should I work on today?"), priority queue with reorder/remove controls, and "Other Active" section to quickly add tasks. Reuses existing TaskRow with full status cycling and subtask support. Daily auto-reset clears the plan each new day. New `set_today_plan` agent action lets the AI set/reorder today's priorities. Tab order: Today | Tasks | Week | Context.

### v0.5.1 — Mar 27, 2026
- **Subtask column reorder** — Due date and linked doc icon now appear to the left of the checkbox for better scannability. Order: `[doc] [due date] [checkbox] [title]`.

### v0.5.0 — Mar 27, 2026
- **Subtask due dates** (FEA-24) — Optional `dueDate` field on subtasks (`YYYY-MM-DD`). Displayed as a compact badge next to each subtask. Highlights red with warning icon when overdue, yellow when within 2 days. Hidden on completed subtasks. Date picker in edit mode. Agent can set `dueDate` when adding or updating subtasks.
- **Auto-update week label** — Header week label (`"Week of March 24-28"`) now auto-corrects to the current week on every load/refresh, no manual rollover needed.
- **Subtask completedAt backfill** — Done subtasks missing `completedAt` (legacy data) are automatically timestamped on load so they collapse after 7 days as intended.

### v0.4.0 — Mar 23, 2026
- **Agent model selector** — Toggle between Haiku (fast/cheap) and Sonnet (capable) in the agent panel header. Selection persists across sessions. Cost estimate adjusts to the active model's pricing.
- **Agent reorder workstreams** — New `reorder_workstreams` action lets the agent rearrange workstream display order.
- **Context Export for Claude.ai** (FEA-23) — Added to roadmap. "Copy Work Context" button to generate a full markdown snapshot of workplan state for pasting into Claude.ai conversations.

### v0.3.0 — Mar 12, 2026
- **Offline / PWA** (FEA-14) — Service worker precaches app shell. localStorage mirrors Supabase for offline fallback. Read-only mode when offline. PWA manifest for Add to Home Screen.
- **Stakeholders column** (FEA-16) — Optional stakeholder tags on tasks, displayed as pill badges. Settable via agent or manual edit.
- **Agent workstream CRUD** (FEA-22) — Agent can create, update, and delete workstreams.
- **Agent update_subtask** — Backfill `completedAt` on legacy subtasks so they auto-collapse correctly.

### v0.2.0 — Mar 11, 2026
- **Week rollover** (FEA-05) — Archive current week, reset statuses, clear activities. Confirm dialog.
- **Week navigation** (FEA-06) — Browse archived weeks with arrow nav. Read-only mode for past weeks.
- **Export weekly summary** (FEA-07) — Markdown export of progress, tasks by status, week shape, notes. Copy or download.
- **Agent panel improvements** (FEA-08) — Markdown rendering, Cmd+K toggle, resizable panel, token/cost display, `update_context` action.
- **Auto-collapse old subtasks** (FEA-21) — Subtasks completed >7 days ago collapse behind a toggle.

### v0.1.0 — Mar 5, 2026
- **Mobile responsive layout** (FEA-01) — Touch-friendly across all views with 640px breakpoint.
- **Tasks/Week/Context view polish** (FEA-02–04) — Workstream styling, editable week cards, context preview with TOC and auto-save.
- **Related documents** (FEA-19) — Attach doc links to tasks/subtasks via agent or edit mode.
- **Agent undo** (FEA-20) — Snapshot-based undo for agent actions with 30s expiry.

### v0.0.1 — Mar 3, 2026
- **Initial release** — Project scaffolded (Vite + React), Supabase storage, Claude API proxy, Netlify deployment.
- **Code decomposition** (INF-02) — Monolith split into 8 components + lib files.
- **Authentication login gate** (FEA-09a) — Supabase Auth with session management.
- **Sub-tasks** (FEA-15) — Nested checklist UI with auto-DONE, agent actions for add/toggle/delete.
- **Sync-before-write** (FEA-17) — Optimistic UI with conflict detection, auto-refresh on focus.

---

## Next Up

| ID | Item | Type | Priority | Details |
|----|------|------|----------|---------|
| FEA-12 | **Calendar Awareness (Google Calendar)** | Feature | **High** | Integrate with Google Calendar so the agent knows about upcoming meetings and can fold them into prioritization and prep. **Recommended approach (≈half-day):** add Google as a Supabase Auth OAuth provider with scope `calendar.events.readonly`. Supabase handles the auth-code exchange, token refresh, and storage; on the client, `supabase.auth.getSession()` returns a `provider_token` that hits the Calendar API directly. **Standalone alternative (≈1.5 days):** own the OAuth flow via a Netlify function for client-secret-protected token exchange + a Supabase row to persist refresh tokens. **Surfacing:** (1) Stat tile on Today view: "next meeting in 2h" with attendee names. (2) Pre-meeting prep nudges: "Prep for May 1:1 in 30m → review SEG-3 status?". (3) Digest block in agent system prompt: today's remaining meetings + any meeting-related tasks (matched by stakeholder name in title). (4) `set_today_plan` becomes calendar-aware — agent picks tasks that fit between meetings rather than 8 deep-work items on a meeting-heavy day. (5) Optional: detect meeting cancellations and prompt "you got an hour back — bump SEG-4 up?". |
| FEA-09 | **Authentication** | Feature | **High** | Add Supabase Auth login gate with email/password. Login screen hides all app content until authenticated. Session persists via Supabase JS client (`onAuthStateChange`). Sign-out button in Header. Update `storage.js` to use session JWT for authenticated Supabase requests. Update RLS policy on `kv_store` to restrict access to authenticated users only (replace the open "Allow all access" policy). Update `claude-proxy.js` to validate the Supabase JWT before proxying to Claude API — reject unauthenticated requests. No signup form needed (single user — create account manually in Supabase dashboard). Prevents unauthorized access to tracker data and agent when deployed publicly. |
| FEA-10 | **Agent Image Import** | Feature | **High** | Add image upload/paste support to the Agent Panel so Mark can share screenshots (Slack messages, charts, data tables, emails) and have the agent interpret them. Implementation: (1) Add a 📎 button next to the send button in AgentPanel input area. Clicking opens a file picker filtered to images (png, jpg, gif, webp). (2) Support clipboard paste — detect `paste` event on the input field, extract image data from `clipboardData.items`. (3) Convert uploaded/pasted images to base64 data URLs. Show a small thumbnail preview above the input before sending. (4) When sending a message with an image, format the Claude API message content as an array with both `image` and `text` blocks per Claude's vision API format: `[{ type: "image", source: { type: "base64", media_type, data } }, { type: "text", text: "user message" }]`. (5) Update `claude-proxy.js` to pass through the multimodal content format. (6) In chat history, render sent images as small inline thumbnails in the user message bubble. (7) Don't persist base64 image data in agent history (too large) — store a placeholder like "[image attached]" in the saved history. |
| FEA-23 | **Context Export for Claude.ai** | Feature | **High** | "Copy Work Context" button (in Header or as a new view) that generates a structured markdown snapshot of the full workplan state, optimized for pasting into Claude.ai as conversation context. Includes: (1) **Progress summary** — overall stats (done/active/waiting/not started counts), per-workstream breakdown. (2) **All tasks with current status** — grouped by workstream, with subtask checklists, stakeholders, and linked documents. (3) **Week shape** — current week's day-by-day plan and focus areas. (4) **Recent agent conversations** — last N messages from agent chat history, so Claude.ai can see what's been discussed and decided. (5) **Quick notes** — recent notes with timestamps. (6) **Context document** — the full agent briefing (role, team, projects). Output is a single markdown document designed to fit within Claude.ai's context window. One-click copy to clipboard. Option to include/exclude sections via checkboxes before copying (e.g., skip agent history if too long). Timestamp header so Claude.ai knows how fresh the data is. This lets Mark start a Claude.ai conversation with full work context without manually summarizing. |
| FEA-38 | **Per-pattern Agent Learning** | Feature | Medium | Layer on top of `update_context_section` and the feedback-signals pipeline shipped in v0.7.0. Detect recurring patterns from undone actions, accepted/rejected tomorrow drafts, and stalled-nudge engagement, then have the agent proactively codify them as durable preferences. Examples: "Mark prefers ≤3 tasks on Fridays" (detected from accepted vs. rejected Friday drafts), "Mark always defers SQL deep work to mornings" (detected from end-of-day rollover patterns), "Mark wants meeting prep tasks added the day before, not day-of" (detected from when meeting-prep tasks first appear in plans vs. when meetings happen). Agent writes these to a new `## Behavioral Preferences` section. Heuristic: only persist after a pattern is observed N≥3 times with consistent direction. |

---

## Future

| ID | Item | Type | Priority | Details |
|----|------|------|----------|---------|
| FEA-11 | **Slack Integration** | Feature | Low | Let the agent draft Slack messages. Could be a new action type `draft_slack` that renders a copyable message in the agent panel, or a direct Slack webhook integration for posting to specific channels. |

---

<details>
<summary><strong>Completed</strong> (40 items)</summary>

| ID | Item | Type | Completed |
|----|------|------|-----------|
| FIX-02 | **Bidirectional Task-Status Normalization** — Adding a subtask to DONE or unchecking the only-done subtask now flips parent → IN PROGRESS. Centralized `normalizeTaskStatus()` applied to every mutation. | Fix | Apr 26 |
| INF-07 | **Pure Mutation Library** — All tracker mutations consolidated in `src/lib/mutations.js`. Manual handlers and agent dispatcher share one implementation. | Infra | Apr 26 |
| FEA-30 | **Agent on Tool-Use API** — Replaced JSON-parsing with Anthropic's tool-use API. 22 typed tool schemas, server-side validation, visible API errors. | Feature | Apr 26 |
| FEA-31 | **Pre-digested State + Feedback Signals** — System prompt sends a compact digest instead of full tracker JSON, plus a feedback-signals block (undone actions, plan rollovers, long-WAITING tasks, stalled subtask progress). Undo tags assistant messages with `undone:true`. | Feature | Apr 26 |
| FEA-32 | **Sectioned Context Doc** — Default briefing reorganized into named sections. New `update_context_section` agent tool appends to (or creates) named sections. | Feature | Apr 26 |
| FEA-33 | **Morning Auto-Triage** — On first Today-view mount each day with no plan, agent auto-generates a priority list. One-shot per day via `todayPlan.autoTriaged` flag. | Feature | Apr 26 |
| FEA-34 | **Today View Redesign** — Card-callout focus, day rail with click-to-scrub history, stat tiles, stalled-task nudges, condensed priority queue with inline expand. | Feature | Apr 26 |
| FEA-35 | **Now-pin** — `nowPinTaskId` for the active task, surfaced as a Header indicator across all views. Agent can `set_now_pin` / `clear_now_pin`. | Feature | Apr 26 |
| FEA-13 | **Weekly Retro** — New "Retro" tab. Agent-generated structured retros (summary, wins, carryover, decisions, next-week focus). Sunday/Monday CTA banner + one-shot Sunday auto-trigger. | Feature | Apr 26 |
| FEA-36 | **End-of-Day + Tomorrow Draft** — End-of-day button writes the log AND drafts tomorrow's plan via `draft_tomorrow_plan` (without applying). Next-morning banner shows accept/dismiss. | Feature | Apr 26 |
| FEA-37 | **Richer Daily Activity** — Week tab daily logs show per-task completion icons (✓◇⏸○), workstream-color accents, day status breakdown. Snapshots `taskStatusSnap`/`taskTitleSnap` on daily reset. | Feature | Apr 26 |
| FEA-39 | **Conversational Morning Intake** — Replaces the silent FEA-33. Agent auto-opens chat on first morning load and runs a 1–3 turn conversation, then calls `propose_morning_plan` with structured proposals. New Morning Intake panel on Today view shows per-action cards with inline editing, accept/skip per item, "↺ discuss further" iterate, "skip for today", and resume-on-reload. | Feature | Apr 27 |
| INF-01 | **Local Project Setup** — GitHub repo (`markqren/workplan`), SSH configured, Vite + React scaffolded, Supabase JS client installed, initial commit pushed to `main`. | Infra | Feb 28 |
| INF-02 | **Code Decomposition** — Decomposed monolithic `work-tracker.jsx` into proper project structure: 8 components (`Header`, `StatsBar`, `TaskRow`, `Workstream`, `WeekShape`, `QuickNotes`, `ContextEditor`, `AgentPanel`), lib files (`constants.js`, `storage.js`, `agent.js`), extracted `default-context.md`, global styles in `styles/index.css`. All functionality preserved. | Infra | Mar 2 |
| INF-03 | **Supabase Setup** — Created Supabase project, `kv_store` table with auto-updating timestamps and open RLS policy. Created `src/lib/supabase.js` client init. Swapped `storage.js` from localStorage to Supabase — same interface, no component changes. Migration SQL saved in `supabase/migrations/001_create_kv_store.sql`. | Infra | Mar 2 |
| INF-04 | **Claude API Proxy** — Created `netlify/functions/claude-proxy.js` serverless function that proxies requests to Claude API with server-side `ANTHROPIC_API_KEY`. Updated `agent.js` to call `/api/claude` instead of Anthropic directly. No API key in client code. | Infra | Mar 2 |
| INF-05 | **Netlify Deployment Config** — Created `netlify.toml` with build command, publish directory, functions directory, and SPA redirect rule. Ready for Netlify auto-deploy from GitHub. | Infra | Mar 2 |
| INF-06 | **Data Migration** — Default seed data baked into `constants.js` (`DEFAULT_DATA`) and `default-context.md`. App auto-seeds on first load when Supabase is empty — no manual migration needed. | Infra | Mar 2 |
| FEA-09a | **Authentication (Login Gate)** — Supabase Auth login screen, session management via `onAuthStateChange`, sign-out button in Header. Auth gates all app content. | Feature | Mar 3 |
| FEA-15 | **Sub-tasks** — Nested sub-tasks for breaking down large items. Indented checklist UI (checkbox + strikethrough), "N/M" progress counter, edit-mode sub-task management (add/edit/delete), auto-DONE when all sub-tasks checked. Agent supports `add_subtask`, `toggle_subtask`, `delete_subtask` actions. Default data restructured to group related tasks into parents with sub-tasks. | Feature | Mar 3 |
| FEA-17 | **Sync-Before-Write** — Multi-device safety: optimistic UI updates with conflict detection (compares `updated_at` timestamps before save, re-applies mutations on fresh data if stale). Auto-refresh on window focus/visibility change (debounced 300ms). Sync toast indicator. Covers all three storage keys. Fixed `saveContext`/`loadContext` JSON wrapping bug. | Feature | Mar 3 |
| FEA-19 | **Related Documents** — Tasks can have attached document links (Google Docs, spreadsheets, etc.) via the AI agent or manual editing. Documents optionally link to specific subtasks with an inline 📄 indicator. Agent supports `add_document`, `update_document`, `delete_document` actions and proactively labels URLs. Edit mode includes label + URL inputs for managing docs. | Feature | Mar 5 |
| FIX-01 | **Agent Chat Scroll** — Agent panel now scrolls to the most recent message when opened, instead of starting at the top. | Fix | Mar 5 |
| FEA-20 | **Agent Undo (Snapshot Cache)** — Undo button appears next to agent responses that triggered actions. In-memory ring buffer (last 5 snapshots) stores pre-action state. Undo restores the snapshot via persist(). Undo expires after 30s or when the user makes a manual edit (epoch invalidation). 5s tick timer auto-hides expired buttons. | Feature | Mar 5 |
| FEA-01 | **Mobile Responsive Layout** — `useIsMobile()` hook (640px breakpoint) used across all components. Header stacks vertically on mobile, StatsBar uses 3-column grid, TaskRow stacks metadata above title with 44px touch targets, AgentPanel goes full-screen overlay, WeekShape single-column, ContextEditor full-width. CSS media query in index.css for base font size. | Feature | Mar 5 |
| FEA-02 | **Tasks View Polish** — Workstream headers: larger 14px color dot (rounded square), task count badge, hover highlight. TaskRow: 6px gap, workstream-color left border via `wsColor` prop. QuickNotes: relative time (`timeAgo`), empty state message. Section divider before Quick Notes. Content max-width increased to 960px. Empty filter state messages on workstreams. | Feature | Mar 5 |
| FEA-03 | **Week View Polish** — Day cards now editable: click focus label or activities to inline-edit (save on blur/Enter). Add/remove day buttons. Separator line between focus and activities. "This Week's Progress" summary bar with done/active/waiting counts and progress bar. Handlers wired in App.jsx via `onUpdateDay`, `onAddDay`, `onRemoveDay`. | Feature | Mar 5 |
| FEA-04 | **Context View Polish** — Edit/Preview tab toggle with simple markdown renderer (headers, bold, code, lists). Word count alongside char count. TOC sidebar parsed from `##` headers with click-to-scroll. Auto-save with 1.5s debounce replacing manual save button. Save status indicator (Unsaved → Saving... → Saved). | Feature | Mar 5 |
| FEA-21 | **Auto-Collapse Old Completed Subtasks** — Subtasks completed >7 days ago are auto-collapsed behind a "▸ N older completed" toggle in TaskRow. Added `completedAt` timestamp to subtask model (set on toggle done, cleared on toggle back). Legacy subtasks without `completedAt` remain visible. Edit mode still shows all subtasks. Agent system prompt updated with new field. | Feature | Mar 11 |
| FEA-05 | **Week Rollover** — "New week" button archives current data under timestamped key, removes DONE tasks, resets IN PROGRESS to NOT STARTED, clears week shape activities, generates new weekLabel. Confirm dialog before executing. Context doc and agent history preserved. | Feature | Mar 11 |
| FEA-06 | **Multiple Weeks Navigation** — ← → arrows in Header to browse archived weeks. Read-only mode disables editing across all components (TaskRow, Workstream, WeekShape, QuickNotes). Amber weekLabel indicator and "back to current" link. Agent panel hidden in archive view. | Feature | Mar 11 |
| FEA-07 | **Export Weekly Summary** — Generates markdown summary (progress stats, tasks by status grouped by workstream with subtask checklists, week shape, notes). Copies to clipboard and downloads as `.md`. Works for both current and archived weeks. | Feature | Mar 11 |
| FEA-08 | **Agent Panel Improvements** — (a) Markdown rendering in agent responses (bold, code, headers, lists, HTML-escaped). (b) Cmd+K / Ctrl+K keyboard shortcut to toggle panel. (c) Resizable panel via drag handle at top-left corner (320×400 to 700×800, desktop only). (d) Token count + cost estimate display in header. (e) `update_context` action lets agent append to context doc with dated header; nudge at 24+ messages. (f) `update_subtask` action for backfilling `completedAt` on legacy subtasks. | Feature | Mar 11 |
| FEA-22 | **Agent Workstream CRUD** — Three new agent actions: `add_workstream` (creates workstream with id, name, prefix, color, description, empty tasks array), `update_workstream` (updates name/color/description/prefix by workstream_id, disallows id change), `delete_workstream` (removes workstream by id). Action labels in AgentPanel. Undo supported via existing snapshot buffer. | Feature | Mar 12 |
| FEA-16 | **Stakeholders Column** — Optional `stakeholders` string array on tasks for tracking interested parties. Displayed as subtle pill badges in TaskRow metadata (both desktop and mobile). Comma-separated input in add and edit forms. Agent can set stakeholders via `add_task` and `update_task` — flows through existing spread operators with no handler changes. | Feature | Mar 12 |
| FEA-25 | **Today View** — "Today" top-level tab (default view) with AI-powered daily triage input, priority queue with reorder/remove, "Other Active" click-to-add section, editable focus note, and daily auto-reset. New `set_today_plan` agent action. `todayPlan` data model (date, taskIds, userNote) added to tracker state. New `TodayView.jsx` component. | Feature | Apr 6 |
| FEA-26 | **Priority Queue Formatting** — Numbered priority badges with workstream accent color circles, left color bar per task for visual grouping, separator lines between tasks. Better spacing and scannability. | Feature | Apr 7 |
| FEA-27 | **Daily Log** — Click-to-edit journal card in Today view. `set_today_log` agent action writes concise daily summaries. "Ask agent to summarize" button. Log stored in `todayPlan.log`, syncs via useEffect when agent writes. | Feature | Apr 7 |
| FEA-28 | **Daily Log History** — Previous days' todayPlans auto-snapshot into `dailyLogs[date]` on daily reset. Week tab displays collapsible daily log entries for the current week with date, focus note, log text, and task count. | Feature | Apr 7 |
| FEA-14 | **Offline / PWA** — Service worker via `vite-plugin-pwa` precaches app shell. localStorage cache layer in `storage.js` mirrors every Supabase read/write for offline fallback. Online/offline detection in App.jsx sets read-only mode when offline, hides agent panel. Amber "offline" indicator in Header. PWA manifest + icons for Add to Home Screen. | Feature | Mar 12 |

</details>

---

## Architecture

```
┌─────────────────────────────────────┐
│           Netlify (Frontend)        │
│  Vite + React single-page app      │
│  Static hosting, free tier          │
├─────────────────────────────────────┤
│       Netlify Functions (API)       │
│  claude-proxy.js                    │
│  - Receives agent messages          │
│  - Injects ANTHROPIC_API_KEY        │
│  - Forwards to Claude API           │
│  - Returns response to client       │
├─────────────────────────────────────┤
│         Supabase (Storage)          │
│  kv_store table                     │
│  - work-tracker-v1 (tracker data)   │
│  - work-tracker-agent-history       │
│  - work-tracker-context             │
│  Row-level security: anon key OK    │
│  for single-user app                │
└─────────────────────────────────────┘
```

## Project Structure

```
workplan/
├── ROADMAP.md                      # This file
├── CLAUDE.md                       # Claude Code project instructions
├── package.json
├── vite.config.js
├── netlify.toml                    # Netlify build + function config
├── .env.example                    # Template for env vars
├── .env                            # Local env vars (gitignored)
│
├── netlify/
│   └── functions/
│       └── claude-proxy.js         # Serverless function to proxy Claude API calls
│
├── src/
│   ├── main.jsx                    # React entry point
│   ├── App.jsx                     # Root component, state management, view routing
│   ├── source-artifact.jsx         # Original monolithic prototype (reference only)
│   │
│   ├── lib/
│   │   ├── constants.js            # Storage keys, status config, type labels, default data
│   │   ├── supabase.js             # Supabase client init
│   │   ├── storage.js              # KV storage abstraction (get/set/delete)
│   │   ├── mutations.js            # Pure tracker-state mutations + agent action dispatcher
│   │   └── agent.js                # System prompt builder, tool schemas, API call
│   │
│   ├── context/
│   │   └── default-context.md      # Default agent briefing document (seed, sectioned)
│   │
│   ├── components/
│   │   ├── Header.jsx              # Sticky header, nav tabs, now-pin indicator
│   │   ├── StatsBar.jsx            # Progress overview (counts + bar)
│   │   ├── Workstream.jsx          # Collapsible workstream with task list + add form
│   │   ├── TaskRow.jsx             # Individual task with status cycling, edit/delete
│   │   ├── WeekShape.jsx           # Weekly planning view + rich daily activity cards
│   │   ├── QuickNotes.jsx          # Inline notes with add/delete
│   │   ├── ContextEditor.jsx       # Agent briefing document editor
│   │   ├── TodayView.jsx           # Day rail, focus callout, priority queue, end-of-day
│   │   ├── MorningIntake.jsx       # Conversational morning planning — proposal cards + inline edit
│   │   ├── WeeklyRetro.jsx         # Agent-generated weekly retros + Sunday CTA
│   │   └── AgentPanel.jsx          # Floating chat panel (mode-aware: normal | morning_intake)
│   │
│   └── styles/
│       └── index.css               # Global styles, fonts, animations
│
└── supabase/
    └── migrations/
        └── 001_create_kv_store.sql # Initial DB schema
```

## Environment & Cost

| Service | What you need | Free tier? |
|---------|--------------|------------|
| GitHub | Private repo | Yes |
| Supabase | Project + anon key | Yes (500MB DB, 50k req/mo) |
| Netlify | Site + env vars | Yes (100GB bandwidth, 125k fn calls/mo) |
| Anthropic | API key | Pay-per-use (~$0.01-0.03 per agent call) |
