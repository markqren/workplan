# ⬡ WORKPLAN — Roadmap & Feature Tracker

**Last updated:** Apr 7, 2026 | Stack: Vite + React + Supabase + Netlify Functions

---

## Releases

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
| FEA-09 | **Authentication** | Feature | **High** | Add Supabase Auth login gate with email/password. Login screen hides all app content until authenticated. Session persists via Supabase JS client (`onAuthStateChange`). Sign-out button in Header. Update `storage.js` to use session JWT for authenticated Supabase requests. Update RLS policy on `kv_store` to restrict access to authenticated users only (replace the open "Allow all access" policy). Update `claude-proxy.js` to validate the Supabase JWT before proxying to Claude API — reject unauthenticated requests. No signup form needed (single user — create account manually in Supabase dashboard). Prevents unauthorized access to tracker data and agent when deployed publicly. |
| FEA-10 | **Agent Image Import** | Feature | **High** | Add image upload/paste support to the Agent Panel so Mark can share screenshots (Slack messages, charts, data tables, emails) and have the agent interpret them. Implementation: (1) Add a 📎 button next to the send button in AgentPanel input area. Clicking opens a file picker filtered to images (png, jpg, gif, webp). (2) Support clipboard paste — detect `paste` event on the input field, extract image data from `clipboardData.items`. (3) Convert uploaded/pasted images to base64 data URLs. Show a small thumbnail preview above the input before sending. (4) When sending a message with an image, format the Claude API message content as an array with both `image` and `text` blocks per Claude's vision API format: `[{ type: "image", source: { type: "base64", media_type, data } }, { type: "text", text: "user message" }]`. (5) Update `claude-proxy.js` to pass through the multimodal content format. (6) In chat history, render sent images as small inline thumbnails in the user message bubble. (7) Don't persist base64 image data in agent history (too large) — store a placeholder like "[image attached]" in the saved history. |
| FEA-23 | **Context Export for Claude.ai** | Feature | **High** | "Copy Work Context" button (in Header or as a new view) that generates a structured markdown snapshot of the full workplan state, optimized for pasting into Claude.ai as conversation context. Includes: (1) **Progress summary** — overall stats (done/active/waiting/not started counts), per-workstream breakdown. (2) **All tasks with current status** — grouped by workstream, with subtask checklists, stakeholders, and linked documents. (3) **Week shape** — current week's day-by-day plan and focus areas. (4) **Recent agent conversations** — last N messages from agent chat history, so Claude.ai can see what's been discussed and decided. (5) **Quick notes** — recent notes with timestamps. (6) **Context document** — the full agent briefing (role, team, projects). Output is a single markdown document designed to fit within Claude.ai's context window. One-click copy to clipboard. Option to include/exclude sections via checkboxes before copying (e.g., skip agent history if too long). Timestamp header so Claude.ai knows how fresh the data is. This lets Mark start a Claude.ai conversation with full work context without manually summarizing. |

---

## Future

| ID | Item | Type | Priority | Details |
|----|------|------|----------|---------|
| FEA-11 | **Slack Integration** | Feature | Low | Let the agent draft Slack messages. Could be a new action type `draft_slack` that renders a copyable message in the agent panel, or a direct Slack webhook integration for posting to specific channels. |
| FEA-12 | **Calendar Awareness** | Feature | Low | Integrate with Google Calendar API so the agent knows about upcoming meetings. Can inform prioritization ("you have a meeting with May in 2 hours, focus on SEG-4") and suggest pre-meeting prep tasks. |
| FEA-13 | **Weekly Retro** | Feature | Low | Agent generates an end-of-week plan-vs-actual summary: what was planned in the week shape vs what actually got done. Highlights wins, carryover items, and suggested focus for next week. Could auto-generate on Friday or on demand. |

---

<details>
<summary><strong>Completed</strong> (29 items)</summary>

| ID | Item | Type | Completed |
|----|------|------|-----------|
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
│   │   └── agent.js                # System prompt builder + API call logic
│   │
│   ├── context/
│   │   └── default-context.md      # Default agent briefing document (seed)
│   │
│   ├── components/
│   │   ├── Header.jsx              # Sticky header with nav tabs + filters
│   │   ├── StatsBar.jsx            # Progress overview (counts + bar)
│   │   ├── Workstream.jsx          # Collapsible workstream with task list + add form
│   │   ├── TaskRow.jsx             # Individual task with status cycling, edit/delete
│   │   ├── WeekShape.jsx           # Weekly planning view (day cards)
│   │   ├── QuickNotes.jsx          # Inline notes with add/delete
│   │   ├── ContextEditor.jsx       # Agent briefing document editor
│   │   ├── TodayView.jsx            # Daily triage + priority queue
│   │   └── AgentPanel.jsx          # Floating chat panel
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
