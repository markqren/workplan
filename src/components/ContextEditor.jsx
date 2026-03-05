import { useState, useEffect, useRef } from "react";
import DEFAULT_CONTEXT from "../context/default-context.md?raw";
import { useIsMobile } from "../hooks/useMediaQuery.js";

function renderMarkdown(md) {
  const lines = md.split("\n");
  let html = "";
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Close list if we're not on a list line
    if (inList && !line.match(/^[-*] /)) {
      html += "</ul>";
      inList = false;
    }

    // Headers
    if (line.match(/^### /)) {
      html += `<h3 style="font-size:13px;color:#E5E5EA;margin:16px 0 6px;font-family:'Space Mono',monospace;font-weight:700">${applyInline(line.slice(4))}</h3>`;
      continue;
    }
    if (line.match(/^## /)) {
      html += `<h2 style="font-size:15px;color:#E5E5EA;margin:20px 0 8px;font-family:'Space Mono',monospace;font-weight:700;border-bottom:1px solid #2A2A2E;padding-bottom:4px">${applyInline(line.slice(3))}</h2>`;
      continue;
    }
    if (line.match(/^# /)) {
      html += `<h1 style="font-size:18px;color:#E5E5EA;margin:20px 0 10px;font-family:'Space Mono',monospace;font-weight:700">${applyInline(line.slice(2))}</h1>`;
      continue;
    }

    // List items
    if (line.match(/^[-*] /)) {
      if (!inList) { html += '<ul style="margin:4px 0;padding-left:20px">'; inList = true; }
      html += `<li style="color:#C7C7CC;font-size:13px;line-height:1.7;margin:2px 0">${applyInline(line.slice(2))}</li>`;
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === "") {
      html += '<div style="height:8px"></div>';
      continue;
    }

    // Normal paragraph
    html += `<p style="color:#C7C7CC;font-size:13px;line-height:1.7;margin:4px 0">${applyInline(line)}</p>`;
  }

  if (inList) html += "</ul>";
  return html;
}

function applyInline(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#E5E5EA">$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:#2A2A2E;padding:1px 4px;border-radius:3px;font-family:\'JetBrains Mono\',monospace;font-size:12px">$1</code>');
}

function parseTOC(text) {
  const lines = text.split("\n");
  const headers = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^##\s+(.+)/);
    if (match) {
      headers.push({ title: match[1], line: i });
    }
  }
  return headers;
}

export default function ContextEditor({ contextDoc, onSave }) {
  const mobile = useIsMobile();
  const [text, setText] = useState(contextDoc);
  const [mode, setMode] = useState("edit"); // 'edit' | 'preview'
  const [saveStatus, setSaveStatus] = useState("saved"); // 'saved' | 'saving' | 'unsaved'
  const textareaRef = useRef(null);

  useEffect(() => { setText(contextDoc); }, [contextDoc]);

  // Auto-save with debounce
  useEffect(() => {
    if (text === contextDoc) {
      setSaveStatus("saved");
      return;
    }
    setSaveStatus("unsaved");
    const timeout = setTimeout(() => {
      setSaveStatus("saving");
      onSave(text);
      setTimeout(() => setSaveStatus("saved"), 500);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [text, contextDoc, onSave]);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const toc = parseTOC(text);

  const scrollToHeader = (lineIndex) => {
    if (!textareaRef.current) return;
    setMode("edit");
    const ta = textareaRef.current;
    const lines = text.split("\n");
    let charPos = 0;
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
      charPos += lines[i].length + 1;
    }
    ta.focus();
    ta.setSelectionRange(charPos, charPos);
    // Estimate scroll position
    const lineHeight = 22; // approximate
    ta.scrollTop = lineIndex * lineHeight - 40;
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{
        background: "#18181B", borderRadius: "10px", padding: mobile ? "12px" : "16px", border: "1px solid #2A2A2E", marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73", textTransform: "uppercase", letterSpacing: "1px", flex: 1 }}>
            Agent Briefing Document
          </div>
          <span style={{ fontSize: "10px", color: "#4A4A4E", fontFamily: "'JetBrains Mono', monospace" }}>
            {text.length.toLocaleString()} chars · {wordCount.toLocaleString()} words
          </span>
        </div>
        <div style={{ fontSize: "11px", color: "#6E6E73", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", marginBottom: "12px" }}>
          This is the agent's persistent memory — everything it knows about your role, team, projects, and dynamics.
          Edit it directly, and it'll be used on every agent interaction. No code changes needed.
        </div>
      </div>

      {/* TOC + Editor layout */}
      <div style={{ display: "flex", gap: "16px", flexDirection: mobile ? "column" : "row" }}>
        {/* TOC sidebar */}
        {toc.length > 0 && (
          <div style={{ width: mobile ? "100%" : "180px", flexShrink: 0 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#4A4A4E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Sections</div>
            {toc.map((h, i) => (
              <div key={i} onClick={() => scrollToHeader(h.line)} style={{
                fontSize: "11px", color: "#6E6E73", fontFamily: "'JetBrains Mono', monospace",
                padding: "3px 0", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
                onMouseEnter={e => e.target.style.color = "#E5E5EA"}
                onMouseLeave={e => e.target.style.color = "#6E6E73"}
              >{h.title}</div>
            ))}
          </div>
        )}

        {/* Main editor area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Mode tabs */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            {["edit", "preview"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                background: mode === m ? "#2A2A2E" : "transparent",
                color: mode === m ? "#E5E5EA" : "#6E6E73",
                border: "1px solid", borderColor: mode === m ? "#3A3A3E" : "transparent",
                borderRadius: "6px", padding: "4px 12px", fontSize: "11px", cursor: "pointer",
                fontFamily: "'Space Mono', monospace", fontWeight: 600, textTransform: "capitalize",
              }}>{m}</button>
            ))}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center",
              color: saveStatus === "saved" ? "#6CC4A1" : saveStatus === "saving" ? "#E8A838" : "#6E6E73",
              transition: "color 0.3s ease",
            }}>
              {saveStatus === "saved" ? "✓ Saved" : saveStatus === "saving" ? "Saving..." : "Unsaved"}
            </span>
          </div>

          {mode === "edit" ? (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              spellCheck={false}
              style={{
                width: "100%", minHeight: "500px", background: "#1C1C1E", color: "#E5E5EA",
                border: "1px solid #2A2A2E", borderRadius: "10px", padding: mobile ? "12px" : "16px",
                fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7,
                resize: "vertical", boxSizing: "border-box", outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = "#E8A838"}
              onBlur={e => e.target.style.borderColor = "#2A2A2E"}
            />
          ) : (
            <div style={{
              width: "100%", minHeight: "500px", background: "#1C1C1E", color: "#E5E5EA",
              border: "1px solid #2A2A2E", borderRadius: "10px", padding: mobile ? "12px" : "16px",
              fontSize: "13px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7,
              boxSizing: "border-box", overflowY: "auto",
            }} dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center" }}>
            <button onClick={() => { setText(DEFAULT_CONTEXT); }} style={{
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
      </div>
    </div>
  );
}
