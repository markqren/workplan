# ⬡ WORKPLAN — Project Roadmap & Setup Guide

_A personal work tracker with an embedded AI agent that has persistent context about your role, team, and projects._

**Target state:** Standalone web app on Netlify, backed by Supabase, accessible from any device including work laptop.

---

## Progress Tracker

| Phase | Status |
|-------|--------|
| 1. Local project setup | ✅ DONE |
| 2. Code decomposition | ⬜ NEXT |
| 3. Supabase setup | ⬜ |
| 4. Claude API proxy | ⬜ |
| 5. Deploy to Netlify | ⬜ |
| 6. Data migration | ⬜ |

---

## What's Done

- GitHub repo created: `markqren/workplan`
- SSH key configured and working
- Vite + React scaffolded
- Supabase JS client installed
- Initial commit pushed to `main`
- Working prototype exists in Claude.ai artifact (`work-tracker.jsx`)
- Agent has rich context system prompt with editable Context tab

---

## Project Structure (Target)

```
workplan/
├── README.md
├── ROADMAP.md                      # This file
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
│   ├── App.jsx                     # Root component, router
│   │
│   ├── lib/
│   │   ├── supabase.js             # Supabase client init
│   │   ├── storage.js              # KV storage abstraction (get/set/delete/list)
│   │   └── agent.js                # Agent API call logic + action executor
│   │
│   ├── context/
│   │   └── default-context.md      # Default agent briefing document (seed)
│   │
│   ├── components/
│   │   ├── Header.jsx              # Sticky header with nav tabs + filters
│   │   ├── StatsBar.jsx            # Progress overview
│   │   ├── Workstream.jsx          # Collapsible workstream with tasks
│   │   ├── TaskRow.jsx             # Individual task with status cycling
│   │   ├── WeekShape.jsx           # Weekly planning view
│   │   ├── QuickNotes.jsx          # Inline notes component
│   │   ├── ContextEditor.jsx       # Agent briefing document editor
│   │   └── AgentPanel.jsx          # Floating chat panel
│   │
│   └── styles/
│       └── index.css               # Global styles, fonts, animations
│
├── public/
│   └── favicon.svg
│
└── supabase/
    └── migrations/
        └── 001_create_kv_store.sql # Initial DB schema
```

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
│  - workplan-data (tracker data)     │
│  - workplan-agent-history           │
│  - workplan-context                 │
│  Row-level security: anon key OK    │
│  for single-user app                │
└─────────────────────────────────────┘
```

---

## Phase 2: Code Decomposition (NEXT)

This is where Claude Code comes in. You'll give it the monolithic `work-tracker.jsx` (the source artifact from Claude.ai) and this roadmap, and ask it to break it into the project structure above.

### Step 1: Copy source files into the repo

Download `work-tracker.jsx` and `ROADMAP.md` from this Claude.ai conversation and put them in the repo root:

```bash
# From your workplan/ directory
cp ~/Downloads/work-tracker.jsx ./src/source-artifact.jsx
cp ~/Downloads/ROADMAP.md ./ROADMAP.md
```

### Step 2: Run Claude Code for decomposition

Open Claude Code in the `workplan/` directory and give it this prompt:

> I'm migrating a single-file React app (src/source-artifact.jsx) into a proper project structure. The target structure is defined in ROADMAP.md. Please:
>
> 1. Read src/source-artifact.jsx and ROADMAP.md
> 2. Decompose the monolithic component into separate files following the project structure
> 3. Create src/lib/storage.js as an abstraction layer — for now, implement it using localStorage as a placeholder (we'll swap to Supabase in the next phase)
> 4. Create src/lib/agent.js with the system prompt builder and API call logic — for now, point the fetch URL to https://api.anthropic.com/v1/messages (we'll swap to /api/claude proxy later)
> 5. Extract the default agent context document into src/context/default-context.md
> 6. Wire everything together in App.jsx with the three views (Tasks, Week, Context)
> 7. Set up src/styles/index.css with the global styles, font imports, and animations
> 8. Update main.jsx to render App
> 9. Delete Vite's default boilerplate (App.css, assets/react.svg, etc.)
> 10. Verify the app runs with npm run dev
>
> Keep all functionality identical to the source artifact. The app should look and behave exactly the same, just properly structured.

### Step 3: Verify and commit

```bash
npm run dev
# Check localhost:5173 — should look identical to the Claude.ai artifact
git add .
git commit -m "decompose into component structure"
git push
```

---

## Phase 3: Supabase Setup

### Step 4: Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `workplan`
3. Region: us-west-1 (closest to Bay Area)
4. Save the **Project URL** and **anon key**

### Step 5: Create the database table

In Supabase SQL Editor, run:

```sql
-- Simple key-value store for all app data
CREATE TABLE kv_store (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamp on changes
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kv_store_timestamp
  BEFORE UPDATE ON kv_store
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Allow anon access (single-user app, no auth needed)
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON kv_store
  FOR ALL USING (true) WITH CHECK (true);
```

Also save this SQL as `supabase/migrations/001_create_kv_store.sql` in your repo for reference.

### Step 6: Configure environment variables

Create `.env` in your repo root:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
ANTHROPIC_API_KEY=sk-ant-...
```

Create `.env.example` (same keys, no values). Make sure `.env` is in `.gitignore`.

### Step 7: Swap storage to Supabase

Use Claude Code:

> Swap the localStorage placeholder in src/lib/storage.js to use Supabase. Create src/lib/supabase.js to initialize the client using VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from environment variables. The storage interface (get/set/delete) should stay identical so no component changes are needed. Here's the Supabase storage implementation:
>
> ```javascript
> // src/lib/supabase.js
> import { createClient } from '@supabase/supabase-js';
> export const supabase = createClient(
>   import.meta.env.VITE_SUPABASE_URL,
>   import.meta.env.VITE_SUPABASE_ANON_KEY
> );
>
> // src/lib/storage.js — swap implementation
> import { supabase } from './supabase.js';
>
> export async function get(key) {
>   const { data, error } = await supabase
>     .from('kv_store').select('value').eq('key', key).single();
>   if (error || !data) return null;
>   return { key, value: JSON.stringify(data.value) };
> }
>
> export async function set(key, value) {
>   const parsed = JSON.parse(value);
>   const { error } = await supabase
>     .from('kv_store').upsert({ key, value: parsed }, { onConflict: 'key' });
>   if (error) throw error;
>   return { key, value };
> }
>
> export async function del(key) {
>   const { error } = await supabase
>     .from('kv_store').delete().eq('key', key);
>   if (error) throw error;
>   return { key, deleted: true };
> }
> ```

### Step 8: Verify and commit

```bash
npm run dev
# Test: add a task, refresh the page — data should persist via Supabase
git add .
git commit -m "supabase storage integration"
git push
```

---

## Phase 4: Claude API Proxy

### Step 9: Create the serverless function

Create `netlify/functions/claude-proxy.js`:

```javascript
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.json();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/claude' };
```

### Step 10: Update agent to use proxy

Use Claude Code:

> Update src/lib/agent.js to call /api/claude instead of the Anthropic API directly. Remove any API key references from client-side code. The serverless function handles authentication server-side.

### Step 11: Commit

```bash
git add .
git commit -m "add claude API proxy function"
git push
```

---

## Phase 5: Deploy to Netlify

### Step 12: Configure Netlify

Create `netlify.toml` in repo root:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Step 13: Connect and deploy

1. Go to [app.netlify.com](https://app.netlify.com) → Add new site → Import from GitHub
2. Select `markqren/workplan`
3. Build settings should auto-detect from `netlify.toml`
4. Add environment variables in Netlify dashboard → Site settings → Environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
5. Deploy

### Step 14: Verify from work laptop

- Hit your Netlify URL (something like `workplan-markqren.netlify.app`)
- Confirm data loads from Supabase
- Test the agent — should route through the serverless function
- Add a task, close browser, reopen — data persists

### Step 15: Commit

```bash
git add .
git commit -m "netlify deployment config"
git push
```

---

## Phase 6: Data Migration

### Step 16: Seed data from Claude.ai artifact

Open the workplan artifact in Claude.ai, open browser console (Cmd+Option+J), and run:

```javascript
const data = await window.storage.get('work-tracker-v1');
const ctx = await window.storage.get('work-tracker-context');
const hist = await window.storage.get('work-tracker-agent-history');
copy(JSON.stringify({ data: data?.value, ctx: ctx?.value, hist: hist?.value }));
```

This copies your current tracker data to clipboard. Then use Claude Code or Supabase SQL Editor to insert it into the `kv_store` table.

---

## Future Roadmap

### v1.1 — Quality of Life
- [ ] Week rollover: archive completed tasks, roll forward incomplete ones
- [ ] Multiple weeks: navigation between weeks, historical view
- [ ] Export: generate weekly summary markdown

### v1.5 — Enhancements
- [ ] Auth: simple password or Supabase magic link
- [ ] Mobile optimization: responsive layout, touch-friendly
- [ ] Agent upgrades: let agent update its own context doc, vision for screenshots

### v2.0 — Integrations
- [ ] Slack integration: agent can draft messages
- [ ] Calendar awareness: agent knows about upcoming meetings
- [ ] Weekly retro: agent generates plan vs. actual summary

---

## Environment & Cost

| Service | What you need | Free tier? |
|---------|--------------|------------|
| GitHub | Private repo | ✅ |
| Supabase | Project + anon key | ✅ (500MB DB, 50k req/mo) |
| Netlify | Site + env vars | ✅ (100GB bandwidth, 125k fn calls/mo) |
| Anthropic | API key | Pay-per-use (~$0.01-0.03 per agent call) |

All well within free tier for single-user usage.

---

## Claude Code Quick Prompts

**Decompose the artifact:**
> Read src/source-artifact.jsx and ROADMAP.md. Decompose the monolithic component into the project structure defined in the roadmap. Keep all functionality identical.

**Swap to Supabase:**
> Replace localStorage in src/lib/storage.js with Supabase. Create src/lib/supabase.js. Same interface, no component changes needed.

**Add a new feature:**
> Add week rollover functionality. When clicking "New Week", archive current data under a timestamped key, reset incomplete tasks to NOT STARTED, clear done tasks. Keep context doc and agent history.

**Debug something:**
> The agent panel isn't returning responses. Check src/lib/agent.js — verify the fetch URL, request format, and response parsing. Check browser console for errors.
