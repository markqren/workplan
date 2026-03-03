import { STORAGE_KEY, AGENT_HISTORY_KEY, CONTEXT_KEY } from './constants.js';

// ── Raw storage abstraction (swap to Supabase in Phase 3) ──────────

async function get(key) {
  const value = localStorage.getItem(key);
  if (value === null) return null;
  return { key, value };
}

async function set(key, value) {
  localStorage.setItem(key, value);
  return { key, value };
}

async function del(key) {
  localStorage.removeItem(key);
  return { key, deleted: true };
}

// ── High-level helpers ─────────────────────────────────────────────

export async function loadData() {
  try {
    const r = await get(STORAGE_KEY);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}

export async function saveData(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    await set(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Save failed:", e);
  }
}

export async function loadAgentHistory() {
  try {
    const r = await get(AGENT_HISTORY_KEY);
    return r ? JSON.parse(r.value) : [];
  } catch {
    return [];
  }
}

export async function saveAgentHistory(history) {
  try {
    await set(AGENT_HISTORY_KEY, JSON.stringify(history.slice(-30)));
  } catch (e) {
    console.error("Agent history save failed:", e);
  }
}

export async function loadContext() {
  try {
    const r = await get(CONTEXT_KEY);
    return r ? r.value : null;
  } catch {
    return null;
  }
}

export async function saveContext(text) {
  try {
    await set(CONTEXT_KEY, text);
  } catch (e) {
    console.error("Context save failed:", e);
  }
}
