---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

一小时前有人把生产 MySQL 上的 invoices 表 drop 掉了；我们在 S3 上有每晚的 dump，服务器上也有 binlog，把这张表恢复到今天 13:55 时的状态。
