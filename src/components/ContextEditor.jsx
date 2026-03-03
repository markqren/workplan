import { useState, useEffect } from "react";
import DEFAULT_CONTEXT from "../context/default-context.md?raw";

export default function ContextEditor({ contextDoc, onSave }) {
  const [text, setText] = useState(contextDoc);
  const [saved, setSaved] = useState(true);

  useEffect(() => { setText(contextDoc); }, [contextDoc]);

  const handleSave = () => {
    onSave(text);
    setSaved(true);
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{
        background: "#18181B", borderRadius: "10px", padding: "16px", border: "1px solid #2A2A2E", marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73", textTransform: "uppercase", letterSpacing: "1px", flex: 1 }}>
            Agent Briefing Document
          </div>
          <span style={{ fontSize: "10px", color: "#4A4A4E", fontFamily: "'JetBrains Mono', monospace" }}>
            {text.length} chars
          </span>
        </div>
        <div style={{ fontSize: "11px", color: "#6E6E73", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", marginBottom: "12px" }}>
          This is the agent's persistent memory — everything it knows about your role, team, projects, and dynamics.
          Edit it directly, and it'll be used on every agent interaction. No code changes needed.
        </div>
      </div>

      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setSaved(false); }}
        spellCheck={false}
        style={{
          width: "100%", minHeight: "500px", background: "#1C1C1E", color: "#E5E5EA",
          border: "1px solid #2A2A2E", borderRadius: "10px", padding: "16px",
          fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7,
          resize: "vertical", boxSizing: "border-box", outline: "none",
        }}
        onFocus={e => e.target.style.borderColor = "#E8A838"}
        onBlur={e => e.target.style.borderColor = "#2A2A2E"}
      />

      <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center" }}>
        <button onClick={handleSave} style={{
          background: saved ? "#2A2A2E" : "linear-gradient(135deg, #E8A838, #E85B5B)",
          color: saved ? "#6E6E73" : "#0D0D0F",
          border: "none", borderRadius: "6px", padding: "8px 20px", fontSize: "12px",
          fontWeight: 600, cursor: "pointer", fontFamily: "'Space Mono', monospace",
          transition: "all 0.15s ease",
        }}>
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
        <button onClick={() => { setText(DEFAULT_CONTEXT); setSaved(false); }} style={{
          background: "transparent", color: "#4A4A4E", border: "1px solid #2A2A2E",
          borderRadius: "6px", padding: "8px 16px", fontSize: "11px", cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          Reset to default
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "10px", color: "#3A3A3E", fontFamily: "'JetBrains Mono', monospace" }}>
          markdown supported
        </span>
      </div>
    </div>
  );
}
