---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Tenemos que renombrar la columna user_name a username en la tabla users de producción y añadir un NOT NULL a email, con Alembic, sin downtime y con forma de revertirlo.
