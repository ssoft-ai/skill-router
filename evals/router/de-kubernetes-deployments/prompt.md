---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Wenn wir v2.3 des Payments-Service auf unseren EKS-Cluster ausrollen, hängen die neuen Pods in CrashLoopBackOff, während die alten trotzdem beendet werden; korrigier die Manifeste, damit das Update auf Readiness wartet und sich selbst zurückrollt.
