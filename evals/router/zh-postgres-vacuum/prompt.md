---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

我们 PG 16 上的 events 表占了 80 GB 磁盘，但活跃行只有 200 万，pg_stat_user_tables 显示有几百万 dead tuples；为什么空间没被回收？怎样在不锁表几个小时的情况下把它缩小？
