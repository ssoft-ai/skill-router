---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Our signup page lets people submit an empty email and a phone number with letters in it, and the backend then throws a 500; make the fields reject bad input with inline messages before submit and check it again on the server.
