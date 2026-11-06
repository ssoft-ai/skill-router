---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Before the sales dashboards refresh each morning, I want automatic assertions that the customers table has no null emails, no duplicate customer_id values, and a row count within 5% of yesterday's, failing the run if any of them break.
