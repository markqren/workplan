import { STORAGE_KEY, AGENT_HISTORY_KEY, CONTEXT_KEY, ARCHIVE_INDEX_KEY } from './constants.js';
import { supabase } from './supabase.js';

// ── localStorage cache helpers ────────────────────────────────────

function cacheKey(key) { return `cache:${key}`; }

function cacheSet(key, value) {
  try { localStorage.setItem(cacheKey(key), value); } catch { /* quota */ }
}

function cacheGet(key) {
  try { return localStorage.getItem(cacheKey(key)); } catch { return null; }
}

// ── Raw storage abstraction (Supabase kv_store) ───────────────────

async function get(key) {
  try {
    const { data, error } = await supabase
      .from('kv_store').select('value').eq('key', key).single();
    if (error || !data) return null;
    const value = JSON.stringify(data.value);
    cacheSet(key, value);
    return { key, value };
  } catch {
    // Offline fallback
    const cached = cacheGet(key);
    if (cached) return { key, value: cached };
    return null;
  }
}

async function set(key, value) {
  const parsed = JSON.parse(value);
  const { data, error } = await supabase
    .from('kv_store').upsert({ key, value: parsed }, { onConflict: 'key' })
    .select('updated_at').single();
  if (error) throw error;
  cacheSet(key, value);
  return { key, value, updatedAt: data?.updated_at || null };
}

async function del(key) {
  const { error } = await supabase
    .from('kv_store').delete().eq('key', key);
  if (error) throw error;
  try { localStorage.removeItem(cacheKey(key)); } catch { /* ok */ }
  return { key, deleted: true };
}

// ── Timestamp helper ──────────────────────────────────────────────

export async function getTimestamp(key) {
  try {
    const { data, error } = await supabase
      .from('kv_store').select('updated_at').eq('key', key).single();
    if (error || !data) return null;
    return data.updated_at;
  } catch {
    return null;
  }
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
    const r = await set(STORAGE_KEY, JSON.stringify(data));
    return r.updatedAt;
  } catch (e) {
    console.error("Save failed:", e);
    return null;
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
    const r = await set(AGENT_HISTORY_KEY, JSON.stringify(history.slice(-30)));
    return r.updatedAt;
  } catch (e) {
    console.error("Agent history save failed:", e);
    return null;
  }
}

export async function loadContext() {
  try {
    const r = await get(CONTEXT_KEY);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}

export async function saveContext(text) {
  try {
    const r = await set(CONTEXT_KEY, JSON.stringify(text));
    return r.updatedAt;
  } catch (e) {
    console.error("Context save failed:", e);
    return null;
  }
}

// ── Archive helpers ───────────────────────────────────────────────

export async function loadArchiveIndex() {
  try {
    const r = await get(ARCHIVE_INDEX_KEY);
    return r ? JSON.parse(r.value) : [];
  } catch {
    return [];
  }
}

export async function saveArchiveIndex(index) {
  try {
    const r = await set(ARCHIVE_INDEX_KEY, JSON.stringify(index));
    return r.updatedAt;
  } catch (e) {
    console.error("Archive index save failed:", e);
    return null;
  }
}

export async function saveArchive(key, data) {
  try {
    const r = await set(key, JSON.stringify(data));
    return r.updatedAt;
  } catch (e) {
    console.error("Archive save failed:", e);
    return null;
  }
}

export async function loadArchive(key) {
  try {
    const r = await get(key);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}
