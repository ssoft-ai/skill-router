---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Wir müssen in der Produktionstabelle users die Spalte user_name in username umbenennen und auf email ein NOT NULL setzen, mit Alembic, ohne Downtime und mit einer Möglichkeit, das zurückzurollen.
