---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Unsere Tabelle events auf PG 16 belegt 80 GB auf der Platte, enthält aber nur 2 Millionen lebende Zeilen, und pg_stat_user_tables zeigt Millionen von Dead Tuples; warum wird der Platz nicht freigegeben, und wie verkleinern wir sie, ohne die Tabelle stundenlang zu sperren?
