---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

我们需要用 Alembic 把生产环境 users 表的 user_name 列改名为 username，并给 email 加上 NOT NULL 约束，要求不停机，而且能回滚。
