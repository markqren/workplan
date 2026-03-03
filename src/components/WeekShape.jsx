export default function WeekShape({ weekShape }) {
  return (
    <div style={{ background: "#18181B", borderRadius: "10px", padding: "16px", marginBottom: "24px", border: "1px solid #2A2A2E" }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#6E6E73", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Week Shape</div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {weekShape.map((day, i) => {
          const focusColor = day.focus === "DONE" ? "#5B8DEF" : day.focus === "PREP" ? "#E8A838" : day.focus === "EXECUTE" ? "#6CC4A1" : day.focus.includes("MEETING") ? "#E85B5B" : "#8E8E93";
          return (
            <div key={i} style={{ flex: "1 1 180px", background: "#1C1C1E", borderRadius: "8px", padding: "10px 12px", borderTop: `2px solid ${focusColor}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#E5E5EA", fontWeight: 600 }}>{day.day}</span>
                <span style={{ fontSize: "9px", color: focusColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.5px" }}>{day.focus}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#8E8E93", lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>{day.activities}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
