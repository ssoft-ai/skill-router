---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

We need to rename the user_name column to username in the production users table and add a NOT NULL constraint on email, with Alembic, without downtime and with a way to roll it back.
