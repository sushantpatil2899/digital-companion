## Togepi's mind (personality, memory, local AI voice)

Long-running, phased work. Before working on it, read `docs/mind/PLAN.md`
(phases, status, working agreement) and `docs/mind/DECISIONS.md` (every
decision so far). Every phase starts with questions to Sushant; record his
answers in DECISIONS.md and update the phase status in PLAN.md. Do not decide
product behaviour on your own.

Every change that adds or changes what Togepi does must also update the
welcome window: bump `WELCOME_VERSION` in `src/main/welcome.js`, add a
`WHATS_NEW` entry (and update `WELCOME` if the overview changed). Sushant
asked for this on 2026-10-21; see PLAN.md, working agreement 6.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
