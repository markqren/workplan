import { useState, useEffect, useRef } from "react";
import { loadAgentHistory, saveAgentHistory } from "../lib/storage.js";
import { callAgent } from "../lib/agent.js";
import { useIsMobile } from "../hooks/useMediaQuery.js";

function actionLabels(actions) {
  if (!actions || actions.length === 0) return [];
  return actions.map(a => {
    if (a.type === "add_task") return `+ ${a.task?.id || "task"}`;
    if (a.type === "update_task") return `↻ ${a.task_id}`;
    if (a.type === "delete_task") return `− ${a.task_id}`;
    if (a.type === "add_note") return "📝 note";
    if (a.type === "add_document") return `📎 ${a.document?.label || "doc"}`;
    if (a.type === "delete_document") return `📎− ${a.document_id}`;
    if (a.type === "update_document") return `📎↻ ${a.document_id}`;
    return null;
  }).filter(Boolean);
}

export default function AgentPanel({ onApplyActions, onUndo, getUndoableMessages, isOpen, onToggle, refreshKey, onHistorySaved, getFreshData }) {
  const mobile = useIsMobile();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [undoTick, setUndoTick] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadAgentHistory().then(h => setMessages(h));
  }, []);

  // Re-load history when another device has newer data
  useEffect(() => {
    if (refreshKey > 0) {
      loadAgentHistory().then(h => setMessages(h));
    }
  }, [refreshKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setUndoTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };

    // Optimistic: show user message immediately
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Pull fresh history + tracker state in parallel before API call
      const [freshHistory, { data: freshData, contextDoc: freshCtx }] = await Promise.all([
        loadAgentHistory(),
        getFreshData(),
      ]);

      // Merge: fresh history from Supabase + user's new message
      const newMessages = [...freshHistory, userMsg];
      setMessages(newMessages);

      const recentHistory = newMessages.slice(-20).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.role === "user" ? m.content : (m.rawJson || m.content),
      }));

      const { parsed, rawJson } = await callAgent(recentHistory, freshData, freshCtx);

      if (parsed.actions && parsed.actions.length > 0) {
        onApplyActions(parsed.actions, newMessages.length);
      }

      const assistantMsg = {
        role: "assistant",
        content: parsed.message || "Done.",
        rawJson,
        actions: parsed.actions || [],
      };
      const updated = [...newMessages, assistantMsg];
      setMessages(updated);
      saveAgentHistory(updated).then(ts => onHistorySaved?.(ts));
    } catch (err) {
      const errorMsg = { role: "assistant", content: `Error: ${err.message}`, actions: [] };
      setMessages(prev => [...prev, errorMsg]);
    }
    setLoading(false);
  };

  if (!isOpen) {
    return (
      <button onClick={onToggle} style={{
        position: "fixed", bottom: "24px", right: "24px", width: "52px", height: "52px",
        borderRadius: "50%", background: "linear-gradient(135deg, #E8A838, #E85B5B)",
        border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "22px", boxShadow: "0 4px 20px rgba(232,168,56,0.3)",
        transition: "transform 0.15s ease", zIndex: 100,
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >⬡</button>
    );
  }

  const panelStyle = mobile
    ? { position: "fixed", inset: 0, background: "#131316", display: "flex", flexDirection: "column", zIndex: 100 }
    : { position: "fixed", bottom: "24px", right: "24px", width: "420px", height: "520px", background: "#131316", borderRadius: "16px", border: "1px solid #2A2A2E", display: "flex", flexDirection: "column", zIndex: 100, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #2A2A2E", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "16px" }}>⬡</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "13px", fontWeight: 700, color: "#E5E5EA", flex: 1 }}>Agent</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#4A4A4E" }}>context-aware</span>
        <button onClick={() => { setMessages([]); saveAgentHistory([]).then(ts => onHistorySaved?.(ts)); }} title="Clear history" style={{ background: "transparent", border: "none", color: "#3A3A3E", cursor: "pointer", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}>clear</button>
        <button onClick={onToggle} style={{ background: "transparent", border: "none", color: "#6E6E73", cursor: "pointer", fontSize: mobile ? "20px" : "16px", padding: "0 4px", minWidth: mobile ? "44px" : "auto", minHeight: mobile ? "44px" : "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages.length === 0 && (
          <div style={{ color: "#3A3A3E", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", textAlign: "center", marginTop: "40px", lineHeight: 1.8 }}>
            <div style={{ fontSize: "28px", marginBottom: "12px", opacity: 0.4 }}>⬡</div>
            I know your workstreams, team,<br />and priorities.<br /><br />
            <span style={{ color: "#4A4A4E" }}>
              "mark SEG-5 as done"<br />
              "add a task to prep for May meeting"<br />
              "what should I focus on next?"<br />
              "Brandye just responded, update SEG-8"
            </span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "85%", padding: "10px 14px",
              borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
              background: msg.role === "user" ? "#2A2518" : "#1C1C1E",
              color: "#E5E5EA", fontSize: "13px", lineHeight: 1.5,
              fontFamily: "'DM Sans', sans-serif",
              border: `1px solid ${msg.role === "user" ? "#4A3A18" : "#2A2A2E"}`,
              whiteSpace: "pre-wrap",
            }}>
              {msg.content}
            </div>
            {msg.actions && msg.actions.length > 0 && (
              <div style={{ maxWidth: "85%", marginTop: "4px", display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
                {actionLabels(msg.actions).map((a, j) => (
                  <span key={j} style={{
                    fontSize: "9px", fontFamily: "'JetBrains Mono', monospace",
                    color: "#6CC4A1", background: "#1A2A1A", border: "1px solid #2A4A2A",
                    padding: "2px 8px", borderRadius: "3px",
                  }}>{a}</span>
                ))}
                {getUndoableMessages().has(i) && (
                  <button onClick={() => onUndo(i)} style={{
                    fontSize: "9px", fontFamily: "'JetBrains Mono', monospace",
                    color: "#E85B5B", background: "#2A1A1A", border: "1px solid #4A2A2A",
                    padding: "2px 8px", borderRadius: "3px", cursor: "pointer",
                    marginLeft: "4px",
                  }}>↩ undo</button>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{
              padding: "10px 14px", borderRadius: "12px 12px 12px 4px",
              background: "#1C1C1E", border: "1px solid #2A2A2E",
              color: "#6E6E73", fontSize: "13px", fontFamily: "'DM Sans', sans-serif",
            }}>
              <span className="agent-thinking">thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: mobile ? "12px 14px 24px" : "12px 14px", borderTop: "1px solid #2A2A2E" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Tell me what to do..."
            style={{
              flex: 1, background: "#0D0D0F", color: "#E5E5EA", border: "1px solid #2A2A2E",
              borderRadius: "8px", padding: mobile ? "12px 14px" : "10px 14px", fontSize: "13px",
              fontFamily: "'DM Sans', sans-serif", outline: "none",
              minHeight: mobile ? "44px" : "auto",
            }}
            onFocus={e => e.target.style.borderColor = "#E8A838"}
            onBlur={e => e.target.style.borderColor = "#2A2A2E"}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()} style={{
            background: input.trim() ? "linear-gradient(135deg, #E8A838, #E85B5B)" : "#2A2A2E",
            border: "none", borderRadius: "8px", padding: mobile ? "0 20px" : "0 16px", cursor: input.trim() ? "pointer" : "default",
            color: input.trim() ? "#0D0D0F" : "#4A4A4E", fontWeight: 700, fontSize: "14px",
            minHeight: mobile ? "44px" : "auto",
          }}>→</button>
        </div>
      </div>
    </div>
  );
}
