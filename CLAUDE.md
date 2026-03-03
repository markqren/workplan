# CLAUDE.md — Project Context for Claude Code

## What This Is

Workplan is a personal work tracker web app with an embedded AI agent. It's built for a single user (Mark, Senior Data Scientist at Pinterest) to manage tasks across work streams, with an AI agent that has deep context about his role, team dynamics, and projects.

## Tech Stack

- **Frontend:** React + Vite
- **Storage:** Supabase (PostgreSQL key-value store) — or localStorage as fallback during dev
- **AI Agent:** Claude API (Sonnet) proxied through Netlify serverless function
- **Hosting:** Netlify (static site + functions)
- **Styling:** Inline styles (no CSS framework). Fonts: Space Mono, JetBrains Mono, DM Sans via Google Fonts.

## Project Structure

See `ROADMAP.md` for full target structure. Key areas:

- `src/components/` — React components (Header, TaskRow, Workstream, AgentPanel, etc.)
- `src/lib/storage.js` — Storage abstraction layer (same get/set/delete interface whether backed by localStorage or Supabase)
- `src/lib/agent.js` — Agent system prompt builder + API call logic
- `src/lib/supabase.js` — Supabase client init
- `src/context/default-context.md` — Default agent briefing document (editable by user at runtime via Context tab)
- `netlify/functions/claude-proxy.js` — Serverless proxy for Claude API (keeps API key server-side)

## Source Artifact

`src/source-artifact.jsx` is the original monolithic React component from the Claude.ai prototype. It contains all functionality in a single file. The goal is to decompose it into the component structure above while keeping behavior identical.

## Key Concepts

### Storage Keys
The app uses three persistent storage keys:
- `work-tracker-v1` — All tracker data (workstreams, tasks, week shape, notes)
- `work-tracker-context` — The agent's editable briefing document
- `work-tracker-agent-history` — Last 30 agent chat messages

### Task Model
```
{
  id: "SEG-5",        // PREFIX-NUMBER
  type: "D",          // N=Narrative, D=Data/SQL, A=Advisory, --=Misc
  title: "...",
  status: "IN PROGRESS",  // NOT STARTED | IN PROGRESS | WAITING | DONE
  target: "Mon-Tue"
}
```

### Workstream Model
```
{
  id: "seg",
  name: "Segmentation",
  prefix: "SEG",
  color: "#E8A838",
  description: "2026 Merchant Segmentation and Strategy",
  tasks: [...]
}
```

### Agent Architecture
The agent gets a system prompt composed of three parts:
1. **Editable context document** (stored in persistent storage, editable via Context tab) — contains info about Mark's role, team, projects, dynamics
2. **Current tracker state** (injected on every call as JSON)
3. **Fixed instructions** (hardcoded) — response format, available actions, behavior guidelines

The agent responds with JSON: `{ "message": "...", "actions": [...] }` where actions can be `add_task`, `update_task`, `delete_task`, or `add_note`. The app parses the response and applies actions to the tracker state.

### Three Views
- **Tasks** — Main view with stats bar, collapsible workstreams, task rows, quick notes
- **Week** — Weekly planning shape (day-by-day focus + activities)
- **Context** — Editable textarea for the agent's briefing document

## Design Principles

- Dark theme (#0D0D0F background)
- Status colors: NOT STARTED=#8E8E93, IN PROGRESS=#6CC4A1, WAITING=#E8A838, DONE=#5B8DEF
- Workstream accent colors: Segmentation=#E8A838, Staples=#5B8DEF, Horizontal=#6CC4A1, Other=#A78BDB
- Click status badges to cycle through statuses
- Agent panel is a floating chat window toggled by ⬡ button (bottom-right)
- Minimal, dense UI — optimized for information density not whitespace

## Environment Variables

```
VITE_SUPABASE_URL=...         # Supabase project URL
VITE_SUPABASE_ANON_KEY=...    # Supabase anonymous key
ANTHROPIC_API_KEY=...          # Claude API key (server-side only, used in netlify function)
```

## Common Commands

```bash
npm run dev          # Start local dev server (localhost:5173)
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build locally
```

## Current Phase

Check the Progress Tracker at the top of `ROADMAP.md` for current status. Follow the phases in order — each phase has a Claude Code prompt you can use directly.

## Important Notes

- This is a single-user app. No auth needed initially.
- The storage abstraction layer (`src/lib/storage.js`) is the key architectural decision — components call the same interface regardless of backend. During local dev it can use localStorage; in production it uses Supabase.
- The Claude API key must NEVER be in client-side code. It goes through the Netlify serverless function.
- Keep inline styles (matching the source artifact) rather than extracting to CSS classes. The current styling approach works and isn't worth refactoring.
