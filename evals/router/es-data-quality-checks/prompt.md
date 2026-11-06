---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Antes de que se actualicen cada mañana los dashboards de ventas, quiero aserciones automáticas de que la tabla customers no tiene emails nulos ni valores de customer_id duplicados y de que el número de filas está dentro de un 5 % del de ayer, y que la ejecución falle si alguna no se cumple.
