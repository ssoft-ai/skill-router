---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

On-call gets paged about 40 times a night by our Prometheus rules for CPU above 80%, and almost all of them clear on their own within a minute; cut the noise without letting a real outage slip through.
