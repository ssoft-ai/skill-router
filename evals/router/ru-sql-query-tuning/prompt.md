---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

SELECT для ежемесячного отчёта по выручке по таблице orders в MySQL 8 с тех пор, как там стало больше 10 миллионов строк, выполняется 40 секунд; вот вывод EXPLAIN, ускорь его до секунды.
