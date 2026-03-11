export const STORAGE_KEY = "work-tracker-v1";
export const AGENT_HISTORY_KEY = "work-tracker-agent-history";
export const CONTEXT_KEY = "work-tracker-context";

export const STATUS_CONFIG = {
  "NOT STARTED": { bg: "#2A2A2E", fg: "#8E8E93", border: "#3A3A3E" },
  "IN PROGRESS": { bg: "#1A2A1A", fg: "#6CC4A1", border: "#2A4A2A" },
  "WAITING":     { bg: "#2A2518", fg: "#E8A838", border: "#4A3A18" },
  "DONE":        { bg: "#1A1A2A", fg: "#5B8DEF", border: "#2A2A4A" },
};

export const TYPE_LABELS = { N: "Narrative", D: "Data/SQL", A: "Advisory", "--": "Misc" };
export const TYPE_ICONS = { N: "◇", D: "⬡", A: "△", "--": "○" };
export const STATUSES = ["NOT STARTED", "IN PROGRESS", "WAITING", "DONE"];

export const DEFAULT_DATA = {
  weekLabel: "Week of March 2-6",
  lastUpdated: new Date().toISOString(),
  workstreams: [
    {
      id: "seg", name: "Segmentation", prefix: "SEG", color: "#E8A838",
      description: "2026 Merchant Segmentation and Strategy",
      tasks: [
        {
          id: "SEG-1", type: "N", title: "Reframe segmentation narrative and strategic positioning for May meeting", status: "IN PROGRESS", target: "Mon-Tue",
          subtasks: [
            { id: "SEG-1a", title: "Reframe F2P: not a linear funnel, one component of broader merchant strategy", done: false, completedAt: null },
            { id: "SEG-1b", title: "Torso sub-segmentation framing: ads-ready vs other stages, decision tree logic", done: false, completedAt: null },
            { id: "SEG-1c", title: "Position relative to Tim 1P segmentation — diplomatic armor for May meeting", done: false, completedAt: null },
          ],
        },
        {
          id: "SEG-2", type: "D", title: "Build segmentation data foundation (1P+3P dataset, Torso SQL, validation)", status: "IN PROGRESS", target: "Mon-Tue",
          subtasks: [
            { id: "SEG-2a", title: "Build unified 1P + 3P dataset — foundation for everything else", done: false, completedAt: null },
            { id: "SEG-2b", title: "Define Torso sub-segments in SQL — ads-ready framing into data cuts", done: false, completedAt: null },
            { id: "SEG-2c", title: "Validate coverage/overlap numbers for updated narrative", done: false, completedAt: null },
          ],
        },
        {
          id: "SEG-3", type: "N", title: "Update slide deck with reframed narrative and new data visuals", status: "IN PROGRESS", target: "Tue AM",
          subtasks: [
            { id: "SEG-3a", title: "Incorporate reframed F2P narrative into deck flow", done: false, completedAt: null },
            { id: "SEG-3b", title: "Add new data visuals and coverage/overlap numbers", done: false, completedAt: null },
          ],
        },
        {
          id: "SEG-4", type: "D", title: "Respond to stakeholder data requests (Brandye, Mita, Tim)", status: "WAITING", target: "Mon-TBD",
          subtasks: [
            { id: "SEG-4a", title: "Brandye: Pull external Torso segmentation data — awaiting clarification", done: false, completedAt: null },
            { id: "SEG-4b", title: "Mita: Provide access/docs for Torso segmentation table", done: true, completedAt: "2026-02-20T00:00:00.000Z" },
            { id: "SEG-4c", title: "Tim Keil: StoreLeads date field, join method, time windows for product metrics", done: true, completedAt: "2026-02-20T00:00:00.000Z" },
          ],
        },
      ],
    },
    {
      id: "stp", name: "Staples", prefix: "STP", color: "#5B8DEF",
      description: "EP Health Check biweekly sub-workstream",
      tasks: [
        {
          id: "STP-1", type: "A", title: "Staples EP Health Check cycle prep and backlog triage", status: "NOT STARTED", target: "Tue-Wed",
          subtasks: [
            { id: "STP-1a", title: "Detail outstanding Staples backlog: brain dump all paused items", done: false, completedAt: null },
            { id: "STP-1b", title: "Confirm needs for next cycle, check in with Agnal/Gobi", done: false, completedAt: null },
          ],
        },
      ],
    },
    {
      id: "hz", name: "Horizontal Team", prefix: "HZ", color: "#6CC4A1",
      description: "Jerry ROAS measurement workstream",
      tasks: [
        { id: "HZ-1", type: "A", title: "ROAS narrative check-in: Attended meeting, provided feedback.", status: "DONE", target: "Mon" },
      ],
    },
    {
      id: "oth", name: "Other", prefix: "OTH", color: "#A78BDB",
      description: "Misc tasks",
      tasks: [
        { id: "OTH-1", type: "--", title: "Scan Slack/email backlog from Cozumel week. Triage responses.", status: "NOT STARTED", target: "Mon-Tue" },
        { id: "OTH-2", type: "D", title: "Build custom work tracker app. Persistent storage, built-in agent.", status: "IN PROGRESS", target: "Future" },
      ],
    },
  ],
  weekShape: [
    { day: "Sunday", focus: "DONE", activities: "Plan organized, SEG-1 narrative started, SEG-2 dataset started, May invite sent" },
    { day: "Monday", focus: "DONE", activities: "SEG-4 stakeholder requests progressed, HZ-1 done, slide progress, dataset work" },
    { day: "Tuesday AM", focus: "PREP", activities: "SEG-3 finalize deck, SEG-2 validation, SEG-1 framing" },
    { day: "Tuesday", focus: "MAY MEETING", activities: "Present progress, get alignment" },
    { day: "Wed-Fri", focus: "EXECUTE", activities: "Incorporate feedback, SEG-2 data continue, STP-1 backlog dump" },
  ],
  notes: [],
};
