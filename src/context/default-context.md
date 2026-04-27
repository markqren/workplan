# Mark's Briefing Document

This document is the agent's long-term memory. The agent reads it at the top of every conversation and can append durable facts via the `update_context_section` tool. Sections are organized by topic so memories don't drift into a single growing list.

## Role

Senior Data Scientist at Pinterest, working on merchant segmentation and targeting within the monetization data science org. Reports directly to Agnal (DS Senior Director) — an unusual skip-level reporting structure designed to give Mark elevated authority. Mark's strengths are narrative construction, executive influence, and strategic framing rather than pure technical depth.

## People

- **Agnal** — DS Senior Director, Mark's direct manager and sponsor. Actively backs Mark, manages politics on his behalf. Has explicitly positioned Mark as the lead on segmentation work.
- **Mita** — VP of Product. Senior executive sponsor of Mark's external sizing approach. Key decision-maker.
- **Tim Keil** — Staff Data Scientist. Built the existing 1P internal merchant segmentation. Generally collaborative and agreeable, but protective of his work. Has received feedback from other directors and can seem demotivated. Works under May.
- **Apoorva** — Tim's manager.
- **May** — Director over Tim and Apoorva's team. Returned from mat leave. Can be oppositional to Mark's framing, but her instincts are often directionally correct. Relationship is functional but not warm.
- **Brandye** — Sr Dir PM, Free to Paid. Has requested external Torso segmentation data.
- **Jerry** — Marketing Science manager running ROAS measurement workstream. Manages Anish and Gobi (both ex-Google). Organized team doing solid work.
- **Gobi** — On Jerry's team, also involved in EP Health Check deep dives with Agnal.

## Project: Segmentation

The primary deliverable. Involves both narrative/strategic work (reframing, positioning, deck updates) and data/SQL work (unified datasets, sub-segment definitions, coverage validation). Tuesday meetings with May's team are a key recurring milestone.

There are four competing merchant segmentation definitions causing organizational confusion:
1. **Sales Enterprise/SMB split** — oriented by sales resources
2. **Tim's 1P internal segmentation** — based on Pinterest first-party signals
3. **Mark's external GMV-based approach (3P)** — uses external data like StoreLeads to estimate merchant size
4. **Shopify as proxy** — people loosely using "Shopify merchant" as shorthand for mid-size/Torso

Mark's key contribution is showing the *intersection* of 1P and 3P — the "Ads-Ready" quadrant analysis. Merchants who are internal-Torso-but-not-external may indicate organic-only/F2P bucket. This is the strategic insight leadership cares about.

The core narrative reframe: F2P is NOT a linear funnel. It's one component of a broader merchant strategy. Merchant size and Pinterest journey stage are two separate dimensions. F2P applies to one zone of that matrix.

Key data tables: `pads_aig.merchants_torso_definition` (merchant-level with torso labels and definition metrics).

## Project: Staples

Launched early Feb, strong reception. EP Health Check is a biweekly sub-workstream. Significant backlog on pause.

## Project: Horizontal

Jerry's ROAS measurement workstream. Mark provides advisory/narrative support — not a primary deliverable owner.

## Working Style

- Mark values clarity and directness over verbosity.
- Strengths in narrative construction and executive influence.
- Can experience anxiety presenting to DS peers (perceived technical judgment) vs. comfort with leadership audiences.
- Has grown in standing his ground during conflicts without folding — represents a shift from typical conflict-avoidant patterns.
- Navigates politics strategically: direct communication with senior leadership while preserving working relationships.

## Preferences

- Prefer concise messages over long ones. Action chips communicate the change; the chat message should add reasoning, not restate the change.
- Use task ids in responses (SEG-3, STP-1) so they're easy to scan.

## Recent Decisions

(Empty — agent will append here as decisions accumulate.)
