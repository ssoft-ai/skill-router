---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Таблица events на PG 16 занимает 80 ГБ на диске, хотя живых строк в ней всего 2 миллиона, а pg_stat_user_tables показывает миллионы мёртвых кортежей; почему место не освобождается и как её ужать, не блокируя таблицу на несколько часов?
