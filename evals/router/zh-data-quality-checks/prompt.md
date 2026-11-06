---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

每天早上销售仪表盘刷新之前，我想自动断言 customers 表里没有为空的 email、没有重复的 customer_id，并且行数和昨天相差不超过 5%，任何一条不满足就让这次运行失败。
