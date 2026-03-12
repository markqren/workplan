# ⬡ WORKPLAN — Roadmap & Feature Tracker

**Last updated:** Mar 12, 2026 | Stack: Vite + React + Supabase + Netlify Functions

---

## Next Up

| ID | Item | Type | Priority | Details |
|----|------|------|----------|---------|
| FEA-09 | **Authentication** | Feature | **High** | Add Supabase Auth login gate with email/password. Login screen hides all app content until authenticated. Session persists via Supabase JS client (`onAuthStateChange`). Sign-out button in Header. Update `storage.js` to use session JWT for authenticated Supabase requests. Update RLS policy on `kv_store` to restrict access to authenticated users only (replace the open "Allow all access" policy). Update `claude-proxy.js` to validate the Supabase JWT before proxying to Claude API — reject unauthenticated requests. No signup form needed (single user — create account manually in Supabase dashboard). Prevents unauthorized access to tracker data and agent when deployed publicly. |
| FEA-10 | **Agent Image Import** | Feature | **High** | Add image upload/paste support to the Agent Panel so Mark can share screenshots (Slack messages, charts, data tables, emails) and have the agent interpret them. Implementation: (1) Add a 📎 button next to the send button in AgentPanel input area. Clicking opens a file picker filtered to images (png, jpg, gif, webp). (2) Support clipboard paste — detect `paste` event on the input field, extract image data from `clipboardData.items`. (3) Convert uploaded/pasted images to base64 data URLs. Show a small thumbnail preview above the input before sending. (4) When sending a message with an image, format the Claude API message content as an array with both `image` and `text` blocks per Claude's vision API format: `[{ type: "image", source: { type: "base64", media_type, data } }, { type: "text", text: "user message" }]`. (5) Update `claude-proxy.js` to pass through the multimodal content format. (6) In chat history, render sent images as small inline thumbnails in the user message bubble. (7) Don't persist base64 image data in agent history (too large) — store a placeholder like "[image attached]" in the saved history. |

---

## Future

| ID | Item | Type | Priority | Details |
|----|------|------|----------|---------|
| FEA-11 | **Slack Integration** | Feature | Low | Let the agent draft Slack messages. Could be a new action type `draft_slack` that renders a copyable message in the agent panel, or a direct Slack webhook integration for posting to specific channels. |
| FEA-12 | **Calendar Awareness** | Feature | Low | Integrate with Google Calendar API so the agent knows about upcoming meetings. Can inform prioritization ("you have a meeting with May in 2 hours, focus on SEG-4") and suggest pre-meeting prep tasks. |
| FEA-13 | **Weekly Retro** | Feature | Low | Agent generates an end-of-week plan-vs-actual summary: what was planned in the week shape vs what actually got done. Highlights wins, carryover items, and suggested focus for next week. Could auto-generate on Friday or on demand. |

---

<details>
<summary><strong>Completed</strong> (25 items)</summary>

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
