import { signOut } from '../lib/auth.js';
import { useIsMobile } from '../hooks/useMediaQuery.js';

export default function Header({ data, view, setView, filter, setFilter, onNewWeek, onExport, onReset, viewingArchive, archiveIndex, onNavigateWeek, onJumpToWeek, offline }) {
  const mobile = useIsMobile();

  const canGoOlder = archiveIndex.length > 0 && (!viewingArchive || archiveIndex.findIndex(e => e.key === viewingArchive) > 0);
  const canGoNewer = !!viewingArchive;

  const arrowStyle = (enabled) => ({
    background: "transparent", border: "none",
    color: enabled ? "#6E6E73" : "#2A2A2E",
    fontSize: "14px", cursor: enabled ? "pointer" : "default",
    fontFamily: "'JetBrains Mono', monospace", padding: "0 2px",
  });

  return (
    <div style={{ padding: mobile ? "16px 16px 12px" : "24px 32px 16px", borderBottom: "1px solid #1C1C1E", position: "sticky", top: 0, background: "#0D0D0F", zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: mobile ? "8px" : "16px", marginBottom: "12px", flexWrap: mobile ? "wrap" : "nowrap" }}>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: mobile ? "16px" : "20px", fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>⬡ WORKPLAN</h1>
        {!mobile && (
          <>
            <button onClick={() => canGoOlder && onNavigateWeek(-1)} style={arrowStyle(canGoOlder)}>←</button>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: viewingArchive ? "#E8A838" : "#6E6E73" }}>{data.weekLabel}</span>
            <button onClick={() => canGoNewer && onNavigateWeek(1)} style={arrowStyle(canGoNewer)}>→</button>
            {viewingArchive ? (
              <button onClick={() => onJumpToWeek(null)} style={{ background: "transparent", border: "none", color: "#5B8DEF", fontSize: "10px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>back to current</button>
            ) : (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#3A3A3E", display: "flex", alignItems: "center", gap: "6px" }}>
                saved {new Date(data.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {offline && <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "#E8A838" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E8A838", display: "inline-block" }} />offline</span>}
              </span>
            )}
          </>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={onExport} style={{ background: "transparent", border: "none", color: "#3A3A3E", fontSize: "10px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>export</button>
        {!viewingArchive && (
          <>
            <button onClick={onNewWeek} style={{ background: "transparent", border: "none", color: "#3A3A3E", fontSize: "10px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>new week</button>
            <button onClick={onReset} style={{ background: "transparent", border: "none", color: "#3A3A3E", fontSize: "10px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>reset</button>
          </>
        )}
        <button onClick={() => signOut()} style={{ background: "transparent", border: "none", color: "#3A3A3E", fontSize: "10px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>sign out</button>
      </div>
      {mobile && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", fontSize: "10px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace", alignItems: "center" }}>
          <button onClick={() => canGoOlder && onNavigateWeek(-1)} style={arrowStyle(canGoOlder)}>←</button>
          <span style={{ color: viewingArchive ? "#E8A838" : "#6E6E73" }}>{data.weekLabel}</span>
          <button onClick={() => canGoNewer && onNavigateWeek(1)} style={arrowStyle(canGoNewer)}>→</button>
          {viewingArchive ? (
            <button onClick={() => onJumpToWeek(null)} style={{ background: "transparent", border: "none", color: "#5B8DEF", fontSize: "10px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", padding: 0 }}>current</button>
          ) : (
            <span style={{ color: "#3A3A3E", display: "flex", alignItems: "center", gap: "6px" }}>
              saved {new Date(data.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {offline && <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "#E8A838" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E8A838", display: "inline-block" }} />offline</span>}
            </span>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: "8px", overflowX: mobile ? "auto" : "visible", WebkitOverflowScrolling: "touch" }}>
        {[...(!viewingArchive ? [{ id: "today", label: "Today" }] : []), { id: "tasks", label: "Tasks" }, { id: "week", label: "Week" }, ...(!viewingArchive ? [{ id: "context", label: "Context" }] : [])].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            background: view === v.id ? "#2A2A2E" : "transparent", color: view === v.id ? "#E5E5EA" : "#6E6E73",
            border: "1px solid", borderColor: view === v.id ? "#3A3A3E" : "transparent",
            borderRadius: "6px", padding: mobile ? "8px 14px" : "5px 14px", fontSize: "12px", cursor: "pointer",
            fontFamily: "'Space Mono', monospace", fontWeight: 600, minHeight: mobile ? "44px" : "auto",
            flexShrink: 0,
          }}>{v.label}</button>
        ))}
        <div style={{ width: "1px", background: "#2A2A2E", margin: "0 4px", flexShrink: 0 }} />
        {view !== "context" && view !== "today" && ["all", "active", "done"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: "transparent", color: filter === f ? "#E5E5EA" : "#4A4A4E",
            border: "none", fontSize: "11px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
            textTransform: "uppercase", letterSpacing: "0.5px",
            borderBottom: filter === f ? "1px solid #6E6E73" : "1px solid transparent",
            padding: mobile ? "8px 8px" : "5px 8px", minHeight: mobile ? "44px" : "auto",
            flexShrink: 0,
          }}>{f}</button>
        ))}
      </div>
    </div>
  );
}
