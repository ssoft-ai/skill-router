---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Nuestra tabla events en PG 16 ocupa 80 GB en disco pero solo tiene 2 millones de filas vivas, y pg_stat_user_tables muestra millones de dead tuples; ¿por qué no se recupera el espacio y cómo la reducimos sin bloquear la tabla durante horas?
