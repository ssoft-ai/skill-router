---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Jemand hat vor einer Stunde die Tabelle invoices in der Produktions-MySQL gedroppt; wir haben nächtliche Dumps in S3 und die Binlogs auf dem Server, also hol die Tabelle auf den Stand von heute 13:55 zurück.
