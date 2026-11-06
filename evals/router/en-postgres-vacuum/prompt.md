---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Our events table on PG 16 takes 80 GB on disk but holds only 2 million live rows, and pg_stat_user_tables shows millions of dead tuples; why isn't the space being reclaimed, and how do we shrink it without locking the table for hours?
