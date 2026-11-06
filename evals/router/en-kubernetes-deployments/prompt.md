---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Rolling out v2.3 of the payments service to our EKS cluster leaves the new pods in CrashLoopBackOff while the old ones get killed anyway; fix the manifests so the update waits for readiness and rolls back on its own.
