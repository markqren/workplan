import { useState, useMemo } from "react";
import { useIsMobile } from "../hooks/useMediaQuery.js";

// ── Helpers ────────────────────────────────────────────────────────

function mondayOf(iso) {
  const d = new Date(iso + "T12:00:00");
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function fmtWeekRange(weekKey) {
  const start = new Date(weekKey + "T12:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (start.getMonth() === end.getMonth()) {
    return `${months[start.getMonth()]} ${start.getDate()}–${end.getDate()}`;
  }
  return `${months[start.getMonth()]} ${start.getDate()} – ${months[end.getMonth()]} ${end.getDate()}`;
}

function fmtRelative(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Main ───────────────────────────────────────────────────────────

export default function WeeklyRetro({ data, onTriageSubmit }) {
  const mobile = useIsMobile();
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);

  // Today / current-week / previous-week keys
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentWeekKey = mondayOf(todayIso);
  const prevWeekKey = (() => {
    const d = new Date(currentWeekKey + "T12:00:00");
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  })();

  const retros = data.weeklyRetros || {};

  // Sorted list of retros (newest first)
  const retroKeys = useMemo(
    () => Object.keys(retros).sort().reverse(),
    [retros]
  );

  const activeWeekKey = selectedWeek || retroKeys[0] || prevWeekKey;
  const activeRetro = retros[activeWeekKey];

  const handleGenerate = async (weekKey) => {
    if (generating) return;
    setGenerating(true);
    setGenerationError(null);
    try {
      const wkRange = fmtWeekRange(weekKey);
      await onTriageSubmit(
        `Generate a weekly retrospective for the week of ${wkRange} (weekKey: ${weekKey}). ` +
        `Review the daily logs, tasks completed, tasks rolled over, and the priority focus each day. ` +
        `Call set_weekly_retro with weekKey="${weekKey}" and a structured retro: ` +
        `summary (2-3 sentences), wins (concrete completions), carryover (what's pushed to next week and why), ` +
        `decisions (notable choices made), and nextWeekFocus (one-line suggestion). ` +
        `Be specific with task ids.`
      );
      setSelectedWeek(weekKey);
    } catch (err) {
      setGenerationError(err.message);
    }
    setGenerating(false);
  };

  // Sunday auto-trigger flag: if it's Sunday/Monday and there's no retro for the
  // previous week yet, surface a prominent CTA banner.
  const today = new Date(todayIso + "T12:00:00");
  const dow = today.getDay();
  const showSundayPrompt = (dow === 0 || dow === 1) && !retros[prevWeekKey];

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: "14px", fontWeight: 700,
          color: "#E5E5EA", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px",
        }}>
          Weekly Retro
        </div>
        <div style={{
          fontSize: "12px", color: "#6E6E73", fontFamily: "'DM Sans', sans-serif",
        }}>
          Agent-generated weekly summaries — wins, carryover, decisions.
        </div>
      </div>

      {/* Sunday prompt */}
      {showSundayPrompt && (
        <div style={{
          background: "linear-gradient(90deg, #1A2A1A 0%, #18181B 100%)",
          border: "1px solid #2A4A2A", borderRadius: "10px",
          padding: "14px 18px", marginBottom: "16px",
          display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
              color: "#6CC4A1", letterSpacing: "1px", marginBottom: "4px",
            }}>✦ NEW WEEK NEAR — RETRO READY?</div>
            <div style={{
              fontSize: "13px", color: "#E5E5EA",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              The week of <strong>{fmtWeekRange(prevWeekKey)}</strong> just wrapped. Generate a retro before context fades?
            </div>
          </div>
          <button
            onClick={() => handleGenerate(prevWeekKey)}
            disabled={generating}
            style={{
              background: "#6CC4A1", color: "#0D0D0F", border: "none", borderRadius: "6px",
              fontSize: "12px", padding: "8px 16px", fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: generating ? "default" : "pointer",
              opacity: generating ? 0.5 : 1,
            }}
          >{generating ? "generating…" : "generate retro →"}</button>
        </div>
      )}

      {/* Week selector */}
      {(retroKeys.length > 0 || data.dailyLogs) && (
        <div style={{
          background: "#18181B", borderRadius: "10px", padding: "12px",
          border: "1px solid #2A2A2E", marginBottom: "16px",
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#6E6E73",
            marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px",
          }}>Weeks</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {retroKeys.map(k => {
              const isActive = k === activeWeekKey;
              return (
                <button
                  key={k}
                  onClick={() => setSelectedWeek(k)}
                  style={{
                    background: isActive ? "#2A2A2E" : "#1C1C1E",
                    border: `1px solid ${isActive ? "#4A4A4E" : "#2A2A2E"}`,
                    borderRadius: "6px", padding: "6px 12px",
                    fontSize: "11px", color: isActive ? "#E5E5EA" : "#8E8E93",
                    fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
                  }}
                >{fmtWeekRange(k)}</button>
              );
            })}
            {!retros[prevWeekKey] && (
              <button
                onClick={() => handleGenerate(prevWeekKey)}
                disabled={generating}
                style={{
                  background: "transparent",
                  border: "1px dashed #4A4A4E",
                  borderRadius: "6px", padding: "6px 12px",
                  fontSize: "11px", color: "#6CC4A1",
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: generating ? "default" : "pointer",
                  opacity: generating ? 0.5 : 1,
                }}
              >+ {fmtWeekRange(prevWeekKey)}</button>
            )}
            {!retros[currentWeekKey] && (
              <button
                onClick={() => handleGenerate(currentWeekKey)}
                disabled={generating}
                style={{
                  background: "transparent",
                  border: "1px dashed #4A4A4E",
                  borderRadius: "6px", padding: "6px 12px",
                  fontSize: "11px", color: "#6CC4A1",
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: generating ? "default" : "pointer",
                  opacity: generating ? 0.5 : 1,
                }}
              >+ {fmtWeekRange(currentWeekKey)} (current)</button>
            )}
          </div>
        </div>
      )}

      {generationError && (
        <div style={{
          background: "#2A1A1A", border: "1px solid #4A2A2A", borderRadius: "8px",
          padding: "8px 12px", marginBottom: "12px",
          fontSize: "12px", color: "#E85B5B", fontFamily: "'DM Sans', sans-serif",
        }}>Error: {generationError}</div>
      )}

      {/* Retro body */}
      {activeRetro ? (
        <RetroCard weekKey={activeWeekKey} retro={activeRetro} mobile={mobile} />
      ) : (
        <div style={{
          background: "#18181B", borderRadius: "10px", padding: "32px 20px",
          border: "1px dashed #2A2A2E", textAlign: "center",
        }}>
          <div style={{
            fontSize: "13px", color: "#6E6E73",
            fontFamily: "'DM Sans', sans-serif", marginBottom: "16px",
          }}>No retro yet for {fmtWeekRange(activeWeekKey)}.</div>
          <button
            onClick={() => handleGenerate(activeWeekKey)}
            disabled={generating}
            style={{
              background: "transparent", border: "1px solid #2A2A2E", borderRadius: "6px",
              color: generating ? "#4A4A4E" : "#6CC4A1",
              fontSize: "12px", padding: "8px 16px",
              fontFamily: "'JetBrains Mono', monospace",
              cursor: generating ? "default" : "pointer",
            }}
          >{generating ? "generating…" : "ask agent to generate →"}</button>
        </div>
      )}
    </div>
  );
}

// ── Retro card ─────────────────────────────────────────────────────

function RetroCard({ weekKey, retro, mobile }) {
  return (
    <div style={{
      background: "#18181B", borderRadius: "10px", padding: mobile ? "16px" : "20px 24px",
      border: "1px solid #2A2A2E",
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "16px",
        flexWrap: "wrap",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: "16px", fontWeight: 700,
          color: "#E5E5EA",
        }}>{fmtWeekRange(weekKey)}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
          color: "#4A4A4E", letterSpacing: "0.5px",
        }}>generated {fmtRelative(retro.generatedAt)}</div>
      </div>

      {/* Summary */}
      {retro.summary && (
        <div style={{
          background: "#1C1C1E", borderLeft: "3px solid #5B8DEF", borderRadius: "4px",
          padding: "12px 16px", marginBottom: "16px",
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "9px",
            color: "#6E6E73", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px",
          }}>Summary</div>
          <div style={{
            fontSize: "13px", color: "#E5E5EA", lineHeight: 1.6,
            fontFamily: "'DM Sans', sans-serif",
          }}>{retro.summary}</div>
        </div>
      )}

      {/* Wins */}
      {retro.wins?.length > 0 && (
        <RetroSection title="Wins" color="#6CC4A1" items={retro.wins} />
      )}

      {/* Carryover */}
      {retro.carryover?.length > 0 && (
        <RetroSection title="Carryover" color="#E8A838" items={retro.carryover} />
      )}

      {/* Decisions */}
      {retro.decisions?.length > 0 && (
        <RetroSection title="Decisions" color="#A78BFA" items={retro.decisions} />
      )}

      {/* Next week focus */}
      {retro.nextWeekFocus && (
        <div style={{
          background: "linear-gradient(90deg, #1A2A2A 0%, #18181B 100%)",
          border: "1px solid #2A4A4A", borderLeft: "3px solid #5B8DEF", borderRadius: "4px",
          padding: "12px 16px", marginTop: "16px",
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "9px",
            color: "#5B8DEF", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px",
          }}>Next week focus</div>
          <div style={{
            fontSize: "13px", color: "#E5E5EA", lineHeight: 1.5, fontStyle: "italic",
            fontFamily: "'DM Sans', sans-serif",
          }}>"{retro.nextWeekFocus}"</div>
        </div>
      )}
    </div>
  );
}

function RetroSection({ title, color, items }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
        color, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px",
      }}>{title}</div>
      <div>
        {items.map((item, i) => (
          <div key={i} style={{
            display: "flex", gap: "10px", padding: "4px 0",
            fontSize: "13px", color: "#C5C5CA",
            fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5,
          }}>
            <span style={{ color, flexShrink: 0 }}>•</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
