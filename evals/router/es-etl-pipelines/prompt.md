---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Cada noche un DAG de Airflow saca los pedidos de la API de Shopify, los transforma y los carga en Snowflake, pero si una ejecución falla a medias y se reintenta, las filas acaban cargadas dos veces; haz que el job se pueda relanzar sin problemas.
