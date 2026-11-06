---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Каждую ночь DAG в Airflow забирает заказы из Shopify API, преобразует их и грузит в Snowflake, но если запуск падает на середине и перезапускается, строки загружаются дважды; сделай так, чтобы job можно было безопасно перезапускать.
