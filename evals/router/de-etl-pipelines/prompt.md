---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Jede Nacht holt ein Airflow-DAG Bestellungen aus der Shopify API, formt sie um und lädt sie in Snowflake, aber wenn ein Lauf mittendrin abbricht und wiederholt wird, landen die Zeilen doppelt drin; mach den Job so, dass man ihn gefahrlos neu starten kann.
