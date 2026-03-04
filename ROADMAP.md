# ⬡ WORKPLAN — Roadmap & Feature Tracker

**Last updated:** Mar 2, 2026 | Stack: Vite + React + Supabase + Netlify Functions

---

## Next Up

| ID | Item | Type | Priority | Details |
|----|------|------|----------|---------|
| FEA-01 | **Mobile Responsive Layout** | Feature | **High** | App is currently desktop-only with fixed widths and small touch targets. Needs full responsive treatment: (1) Header — stack nav tabs and filters vertically on mobile, increase tap targets to 44px minimum, collapse week label / saved timestamp into a second row. (2) StatsBar — wrap stat items into a 2×3 grid on narrow screens, keep progress bar full-width below. (3) TaskRow — stack task metadata (type tag, target) above title instead of inline, make status badge and action buttons (edit/delete) larger and spaced for touch. (4) Workstream — full-width with reduced horizontal padding (32px → 16px). (5) AgentPanel — expand to full-screen overlay on mobile (bottom sheet style) instead of fixed 420×520 box, larger input field, send button. (6) WeekShape — single-column stack instead of flex-wrap row. (7) ContextEditor — full-width textarea with reduced padding. (8) QuickNotes — larger input and delete targets. Breakpoint: 640px for mobile, 768px for tablet. Use CSS media queries in `src/styles/index.css` plus conditional inline style overrides where needed. |
| FEA-02 | **Tasks View Polish** | Feature | **High** | Improve default formatting on the Tasks view: (1) Workstream headers — add subtle hover highlight, make the color indicator dot slightly larger (10px → 14px), add task count badge next to name. (2) TaskRow — improve visual hierarchy with slightly more vertical spacing between tasks (4px → 6px gap), add subtle left-border color that matches workstream color (not just status color). (3) Quick Notes section — add a section divider/separator before it, timestamp formatting should show relative time ("2h ago") not just day name. (4) Empty states — show a helpful message when a workstream has no tasks matching the current filter, and when notes are empty. (5) Overall spacing — increase content max-width from 900px to 960px for better use of screen real estate. |
| FEA-03 | **Week View Polish** | Feature | **Medium** | Improve the Week Shape view: (1) Make day cards editable — click to edit focus label and activities text inline, with save on blur/Enter. Currently the week shape is read-only after initial load. (2) Add ability to add/remove day cards. (3) Better visual hierarchy — larger focus label, separator line between focus and activities. (4) Add a "This Week's Progress" summary at top showing completion stats (like StatsBar but contextual to the week). (5) Quick Notes section should match Tasks view formatting. |
| FEA-04 | **Context View Polish** | Feature | **Low** | Improve the Context Editor: (1) Add a simple markdown preview toggle (split view or tab toggle between edit/preview). (2) Show word count alongside char count. (3) Add section navigation — detect `##` headers and show a clickable outline/TOC sidebar. (4) Auto-save with debounce (currently requires manual save button click). |
| FEA-05 | **Week Rollover** | Feature | **Medium** | Add "New Week" button to Header. On click: archive current data under a timestamped key (`work-tracker-archive-YYYY-MM-DD`), reset incomplete tasks (NOT STARTED and IN PROGRESS) to NOT STARTED, remove DONE tasks, clear week shape activities, update weekLabel to new date range. Keep context doc and agent history intact. Confirm dialog before executing. |
| FEA-06 | **Multiple Weeks Navigation** | Feature | **Medium** | After FEA-05 is implemented, add week navigation arrows (← →) in Header to browse archived weeks. Read-only view of past weeks with their task snapshots and week shapes. Current week is always the editable one. Show a list/calendar picker for jumping to specific past weeks. |
| FEA-07 | **Export Weekly Summary** | Feature | **Low** | Generate a markdown summary of the current week: tasks completed, tasks in progress, notes, week shape. Copy to clipboard or download as `.md`. Useful for weekly standup prep or async status updates. |
| FEA-08 | **Agent Panel Improvements** | Feature | **Medium** | (1) Markdown rendering in agent responses (currently plain text with `pre-wrap`). (2) Resize handle on agent panel to adjust width/height. (3) Keyboard shortcut to toggle panel (e.g. `Cmd+K`). (4) Show token count / cost estimate per message. (5) Let agent update its own context doc via a new `update_context` action type. |
| FEA-09 | **Authentication** | Feature | **High** | Add Supabase Auth login gate with email/password. Login screen hides all app content until authenticated. Session persists via Supabase JS client (`onAuthStateChange`). Sign-out button in Header. Update `storage.js` to use session JWT for authenticated Supabase requests. Update RLS policy on `kv_store` to restrict access to authenticated users only (replace the open "Allow all access" policy). Update `claude-proxy.js` to validate the Supabase JWT before proxying to Claude API — reject unauthenticated requests. No signup form needed (single user — create account manually in Supabase dashboard). Prevents unauthorized access to tracker data and agent when deployed publicly. |
| FEA-10 | **Agent Image Import** | Feature | **High** | Add image upload/paste support to the Agent Panel so Mark can share screenshots (Slack messages, charts, data tables, emails) and have the agent interpret them. Implementation: (1) Add a 📎 button next to the send button in AgentPanel input area. Clicking opens a file picker filtered to images (png, jpg, gif, webp). (2) Support clipboard paste — detect `paste` event on the input field, extract image data from `clipboardData.items`. (3) Convert uploaded/pasted images to base64 data URLs. Show a small thumbnail preview above the input before sending. (4) When sending a message with an image, format the Claude API message content as an array with both `image` and `text` blocks per Claude's vision API format: `[{ type: "image", source: { type: "base64", media_type, data } }, { type: "text", text: "user message" }]`. (5) Update `claude-proxy.js` to pass through the multimodal content format. (6) In chat history, render sent images as small inline thumbnails in the user message bubble. (7) Don't persist base64 image data in agent history (too large) — store a placeholder like "[image attached]" in the saved history. |
| FEA-15 | **Sub-tasks** | Feature | **Medium** | Tasks should support nested sub-tasks for breaking down large items. (1) Add optional `subtasks` array to the task model: `[{ id: "SEG-5a", title: "...", done: false }]`. (2) In TaskRow, render sub-tasks as an indented checklist below the parent task title — checkbox toggles `done`. (3) Show sub-task progress inline on the parent (e.g. "2/4" or a mini progress bar next to the title). (4) Add ability to add/remove sub-tasks via the task edit form. (5) Parent task auto-suggests DONE status when all sub-tasks are checked (but doesn't force it). (6) Agent should be able to create sub-tasks via a new `add_subtask` action or by including `subtasks` in `add_task`/`update_task`. (7) Sub-tasks don't appear as standalone rows — they're always nested under their parent. |
| FEA-16 | **Stakeholders Column** | Feature | **Medium** | Add an optional `stakeholders` field to each task for tracking interested parties. (1) Extend the task model with `stakeholders: ["May", "Jason"]` — an array of name strings. (2) In TaskRow, display stakeholders as small pill/tag badges next to the task metadata (after type and target), styled subtly (e.g. #2A2A2E background, #8E8E93 text, 10px font). (3) Add a stakeholders input to the task add/edit form — comma-separated names or tag-style input. (4) In StatsBar or a new summary, optionally show tasks grouped by stakeholder for "who's waiting on what" visibility. (5) Agent can set stakeholders via `add_task` and `update_task` actions. (6) Filter support — add a stakeholder filter dropdown or let the existing filter bar filter by stakeholder name. |
| FEA-18 | **Agent Context Auto-Distillation** | Feature | **High** | The agent should proactively distill important information from conversations into its persistent context document before messages are evicted from the 30-message history window. This gives the agent long-term memory that survives chat history truncation. Implementation: (1) Add a new agent action type `update_context` — takes `{ action: "update_context", updates: "..." }` where `updates` is a string of new information to append or merge into the context doc. (2) In the agent system prompt instructions, add a directive: "Before the conversation history fills up, proactively extract and save any important new information (decisions made, preferences learned, project updates, relationship dynamics, new context about tasks/people/priorities) into your context document using the `update_context` action. Do this naturally alongside your regular responses — don't wait to be asked." (3) On the app side, handle the `update_context` action in `App.jsx` by appending the updates to the stored context doc (under a `## Agent-Learned Notes` section at the bottom, with a timestamp). (4) Add a trigger check: when the agent history reaches 24+ messages (80% of the 30-message limit), include an extra system nudge in the next API call: "Your conversation history is getting long and older messages will soon be dropped. If there's anything important from this conversation you haven't saved to your context document yet, use `update_context` now." (5) The agent should also use `update_context` any time it learns something significant mid-conversation — don't only rely on the near-limit nudge. (6) In the Context Editor view, visually distinguish agent-written notes (e.g. with a subtle border or label) from user-written content so Mark can review/edit/delete what the agent has learned. |

---

## Future

| ID | Item | Type | Priority | Details |
|----|------|------|----------|---------|
| FEA-11 | **Slack Integration** | Feature | Low | Let the agent draft Slack messages. Could be a new action type `draft_slack` that renders a copyable message in the agent panel, or a direct Slack webhook integration for posting to specific channels. |
| FEA-12 | **Calendar Awareness** | Feature | Low | Integrate with Google Calendar API so the agent knows about upcoming meetings. Can inform prioritization ("you have a meeting with May in 2 hours, focus on SEG-4") and suggest pre-meeting prep tasks. |
| FEA-13 | **Weekly Retro** | Feature | Low | Agent generates an end-of-week plan-vs-actual summary: what was planned in the week shape vs what actually got done. Highlights wins, carryover items, and suggested focus for next week. Could auto-generate on Friday or on demand. |
| FEA-14 | **Offline / PWA** | Feature | Medium | Cache app shell and last-known data for offline viewing. Service Worker for asset caching, IndexedDB for data snapshot. Offline mode is read-only. Add `manifest.json` for Add to Home Screen on mobile. |

---

<details>
<summary><strong>Completed</strong> (8 items)</summary>

| ID | Item | Type | Completed |
|----|------|------|-----------|
| INF-01 | **Local Project Setup** — GitHub repo (`markqren/workplan`), SSH configured, Vite + React scaffolded, Supabase JS client installed, initial commit pushed to `main`. | Infra | Feb 28 |
| INF-02 | **Code Decomposition** — Decomposed monolithic `work-tracker.jsx` into proper project structure: 8 components (`Header`, `StatsBar`, `TaskRow`, `Workstream`, `WeekShape`, `QuickNotes`, `ContextEditor`, `AgentPanel`), lib files (`constants.js`, `storage.js`, `agent.js`), extracted `default-context.md`, global styles in `styles/index.css`. All functionality preserved. | Infra | Mar 2 |
| INF-03 | **Supabase Setup** — Created Supabase project, `kv_store` table with auto-updating timestamps and open RLS policy. Created `src/lib/supabase.js` client init. Swapped `storage.js` from localStorage to Supabase — same interface, no component changes. Migration SQL saved in `supabase/migrations/001_create_kv_store.sql`. | Infra | Mar 2 |
| INF-04 | **Claude API Proxy** — Created `netlify/functions/claude-proxy.js` serverless function that proxies requests to Claude API with server-side `ANTHROPIC_API_KEY`. Updated `agent.js` to call `/api/claude` instead of Anthropic directly. No API key in client code. | Infra | Mar 2 |
| INF-05 | **Netlify Deployment Config** — Created `netlify.toml` with build command, publish directory, functions directory, and SPA redirect rule. Ready for Netlify auto-deploy from GitHub. | Infra | Mar 2 |
| INF-06 | **Data Migration** — Default seed data baked into `constants.js` (`DEFAULT_DATA`) and `default-context.md`. App auto-seeds on first load when Supabase is empty — no manual migration needed. | Infra | Mar 2 |
| FEA-09a | **Authentication (Login Gate)** — Supabase Auth login screen, session management via `onAuthStateChange`, sign-out button in Header. Auth gates all app content. | Feature | Mar 3 |
| FEA-17 | **Sync-Before-Write** — Multi-device safety: optimistic UI updates with conflict detection (compares `updated_at` timestamps before save, re-applies mutations on fresh data if stale). Auto-refresh on window focus/visibility change (debounced 300ms). Sync toast indicator. Covers all three storage keys. Fixed `saveContext`/`loadContext` JSON wrapping bug. | Feature | Mar 3 |

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
