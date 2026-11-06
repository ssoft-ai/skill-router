---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Alguien hizo DROP de la tabla invoices en el MySQL de producción hace una hora; tenemos dumps nocturnos en S3 y los binlogs en el servidor, así que deja la tabla como estaba hoy a las 13:55.
