# ⬡ WORKPLAN — Project Roadmap & Setup Guide

_A personal work tracker with an embedded AI agent that has persistent context about your role, team, and projects._

**Current state:** Working prototype in Claude.ai artifact with persistent storage, full task management UI, and context-aware AI agent.

**Target state:** Standalone web app on Netlify, backed by Supabase, accessible from any device including work laptop.

---

## Project Structure

```
workplan_site/
├── README.md
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
        └── 001_create_kv_store.sql  # Initial DB schema
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
│  - work-tracker-v1 (tracker data)   │
│  - work-tracker-agent-history       │
│  - work-tracker-context             │
│  Row-level security: anon key OK    │
│  for single-user app                │
└─────────────────────────────────────┘
```

---

## Step-by-Step Setup Guide

### Phase 1: Local Project Setup

**Step 1: Create GitHub repo**
1. Go to [github.com/new](https://github.com/new) → name it `workplan_site`, set to private, create
2. Locally:
```bash
mkdir workplan_site && cd workplan_site
git init
git remote add origin git@github.com:<your-username>/workplan_site.git
```

**Step 2: Initialize Vite + React project**
```bash
npm create vite@latest . -- --template react
npm install
```

**Step 3: Install dependencies**
```bash
npm install @supabase/supabase-js
```

**Step 4: Create project structure**
- Move the current monolithic `work-tracker.jsx` into the component structure above
- Claude Code can handle this decomposition — prompt it with: _"Decompose this single-file React component into the project structure defined in the roadmap. Extract each component, create the storage abstraction layer, and set up the Vite entry point."_
- Provide it both this roadmap file and the current `work-tracker.jsx`

**Step 5: Environment variables**
Create `.env`:
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
ANTHROPIC_API_KEY=<your-anthropic-api-key>
```
Create `.env.example` (same keys, no values). Add `.env` to `.gitignore`.

**Step 6: Verify local dev**
```bash
npm run dev
```

---

### Phase 2: Supabase Setup

**Step 7: Create Supabase project**
1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `workplan` (or whatever you want)
3. Region: pick closest to you (us-west-1 if Bay Area)
4. Save the project URL and anon key → put in `.env`

**Step 8: Create the KV store table**
In Supabase SQL Editor, run:
```sql
-- Simple key-value store for tracker data
CREATE TABLE kv_store (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamp
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

-- Allow anon access (single-user app, no auth needed yet)
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON kv_store
  FOR ALL USING (true) WITH CHECK (true);
```

**Step 9: Create storage abstraction**
In `src/lib/storage.js`, create a drop-in replacement for `window.storage`:
```javascript
import { supabase } from './supabase.js';

export async function get(key) {
  const { data, error } = await supabase
    .from('kv_store')
    .select('value')
    .eq('key', key)
    .single();
  if (error || !data) return null;
  return { key, value: JSON.stringify(data.value) };
}

export async function set(key, value) {
  const parsed = JSON.parse(value);
  const { data, error } = await supabase
    .from('kv_store')
    .upsert({ key, value: parsed }, { onConflict: 'key' })
    .select()
    .single();
  if (error) throw error;
  return { key, value };
}

export async function del(key) {
  const { error } = await supabase
    .from('kv_store')
    .delete()
    .eq('key', key);
  if (error) throw error;
  return { key, deleted: true };
}
```

This means the components don't need to change their logic at all — same `get`/`set` interface, just backed by Supabase instead of `window.storage`.

---

### Phase 3: Claude API Proxy

**Step 10: Create Netlify serverless function**
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

**Step 11: Update agent API calls**
In `src/lib/agent.js`, change the fetch URL from `https://api.anthropic.com/v1/messages` to `/api/claude`. The serverless function handles auth server-side so the API key never touches the browser.

---

### Phase 4: Deploy

**Step 12: Configure Netlify**
Create `netlify.toml`:
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

**Step 13: Connect to Netlify**
1. Go to [app.netlify.com](https://app.netlify.com) → Add new site → Import from GitHub
2. Select your `workplan_site` repo
3. Build settings should auto-detect from `netlify.toml`
4. Add environment variables in Netlify dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
5. Deploy

**Step 14: Verify**
- Hit your Netlify URL from your work laptop
- Confirm data loads from Supabase
- Test the agent (should route through serverless function)
- Add a task, close the browser, reopen — data should persist

---

### Phase 5: Data Migration

**Step 15: Seed initial data**
You have existing data in Claude.ai's artifact storage. To migrate:
1. Open the tracker artifact here in Claude.ai
2. Open browser console → run:
   ```javascript
   const data = await window.storage.get('work-tracker-v1');
   const ctx = await window.storage.get('work-tracker-context');
   const hist = await window.storage.get('work-tracker-agent-history');
   console.log(JSON.stringify({ data: data?.value, ctx: ctx?.value, hist: hist?.value }));
   ```
3. Copy the output
4. Insert into Supabase via SQL Editor or use the Claude Code CLI to write a quick seed script

---

## Future Roadmap

### Near-term (v1.1)
- [ ] Week rollover: archive completed tasks, roll forward incomplete ones
- [ ] Multiple weeks: navigation between weeks, historical view
- [ ] Export: generate weekly summary markdown (shareable with Agnal)

### Medium-term (v1.5)
- [ ] Auth: simple password or Supabase magic link (if you want it secured)
- [ ] Mobile optimization: responsive layout, touch-friendly status cycling
- [ ] Agent upgrades: let agent update the context doc itself, read screenshots via vision

### Long-term (v2.0)
- [ ] Slack integration: agent can draft Slack messages, pull thread context
- [ ] Calendar awareness: agent knows about upcoming meetings from context doc
- [ ] Weekly retro: agent generates end-of-week summary comparing plan vs. actual

---

## Key Commands (Claude Code)

Useful prompts for Claude Code as you develop:

**Initial decomposition:**
> Decompose work-tracker.jsx into the project structure defined in ROADMAP.md. Keep all functionality identical but split into separate component files with the storage abstraction layer.

**Supabase integration:**
> Replace all window.storage calls with the Supabase storage abstraction in src/lib/storage.js. The interface should be identical so components don't need logic changes.

**Testing the proxy:**
> Create a test script that sends a sample agent message through the Netlify function at /api/claude and logs the response.

**Adding a feature:**
> Add week rollover functionality. When clicking "New Week", archive current week's data under a timestamped key, reset incomplete tasks to NOT STARTED, and clear completed tasks. Keep the context doc and agent history unchanged.

---

## Environment Checklist

| Service | What you need | Free tier? |
|---------|--------------|------------|
| GitHub | Private repo | ✅ |
| Supabase | Project + anon key | ✅ (500MB DB, 50k requests/mo) |
| Netlify | Site + env vars | ✅ (100GB bandwidth, 125k function calls/mo) |
| Anthropic | API key | Pay-per-use (agent calls are small, ~$0.01-0.03 each) |

All well within free tier limits for a single-user app.
