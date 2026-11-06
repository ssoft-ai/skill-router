---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Every night an Airflow DAG pulls orders from the Shopify API, reshapes them and loads them into Snowflake, but when a run fails halfway and gets retried the rows end up loaded twice; make the job safe to rerun.
