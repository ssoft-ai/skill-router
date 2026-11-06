---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Das SELECT für den monatlichen Umsatzbericht auf der Tabelle orders in MySQL 8 dauert jetzt 40 Sekunden, seit wir über 10 Millionen Zeilen haben; hier ist die EXPLAIN-Ausgabe, bring es unter eine Sekunde.
