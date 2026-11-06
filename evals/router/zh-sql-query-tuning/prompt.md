---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

月度营收报表在 MySQL 8 的 orders 表上的那条 SELECT，自从数据超过 1000 万行后要跑 40 秒；这是 EXPLAIN 的输出，把它优化到一秒以内。
