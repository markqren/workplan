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
        { id: "SEG-1", type: "N", title: "Reframe F2P narrative: F2P is not a linear funnel, it is one component of a broader merchant strategy.", status: "IN PROGRESS", target: "Mon" },
        { id: "SEG-2", type: "N", title: "Torso sub-segmentation framing: Define ads-ready vs other stages. Decision tree logic.", status: "NOT STARTED", target: "Mon-Tue" },
        { id: "SEG-3", type: "N", title: "Position relative to Tim 1P segmentation. Diplomatic armor for May meeting.", status: "NOT STARTED", target: "Mon" },
        { id: "SEG-4", type: "N", title: "Update slide deck: Incorporate reframed narrative and new visuals.", status: "IN PROGRESS", target: "Tue AM" },
        { id: "SEG-5", type: "D", title: "Build unified 1P + 3P dataset. Foundation for everything else.", status: "IN PROGRESS", target: "Mon" },
        { id: "SEG-6", type: "D", title: "Define Torso sub-segments in SQL. Ads-ready framing into data cuts.", status: "NOT STARTED", target: "Mon-Tue" },
        { id: "SEG-7", type: "D", title: "Validate coverage/overlap numbers for updated narrative.", status: "NOT STARTED", target: "Tue AM" },
        { id: "SEG-8", type: "D", title: "Brandye request: Pull external Torso segmentation data. Awaiting clarification.", status: "WAITING", target: "TBD" },
        { id: "SEG-9", type: "D", title: "Mita request: Provide access/docs for Torso segmentation table.", status: "DONE", target: "Mon" },
        { id: "SEG-10", type: "D", title: "Tim Keil Qs on torso tables (bumped Feb 27): StoreLeads date field, join method, time windows for product metrics. Urgent.", status: "DONE", target: "Mon" },
      ],
    },
    {
      id: "stp", name: "Staples", prefix: "STP", color: "#5B8DEF",
      description: "EP Health Check biweekly sub-workstream",
      tasks: [
        { id: "STP-1", type: "N", title: "Detail outstanding Staples backlog: Brain dump all paused items.", status: "NOT STARTED", target: "This week" },
        { id: "STP-2", type: "A", title: "EP Health Check prep: Confirm needs for next cycle, check in with Agnal/Gobi.", status: "NOT STARTED", target: "Tue-Wed" },
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
    { day: "Sunday", focus: "DONE", activities: "Plan organized, SEG-1 started, SEG-5 started, May invite sent" },
    { day: "Monday", focus: "DONE", activities: "SEG-9 done, SEG-8 responded, HZ-1 done, slide progress, dataset work" },
    { day: "Tuesday AM", focus: "PREP", activities: "SEG-4 finalize, SEG-7 validation, SEG-2/3 framing" },
    { day: "Tuesday", focus: "MAY MEETING", activities: "Present progress, get alignment" },
    { day: "Wed-Fri", focus: "EXECUTE", activities: "Incorporate feedback, SEG-5/6 continue, STP-1 backlog dump" },
  ],
  notes: [],
};
