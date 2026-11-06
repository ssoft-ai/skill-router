---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

我们每晚用一个 Airflow DAG 从 Shopify API 拉订单，转换后加载到 Snowflake，但如果某次运行中途失败再重试，数据就会被重复加载；让这个任务可以安全地重跑。
