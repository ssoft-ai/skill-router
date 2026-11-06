---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Al desplegar la v2.3 del servicio de pagos en nuestro clúster EKS, los pods nuevos se quedan en CrashLoopBackOff mientras los viejos se matan igualmente; arregla los manifiestos para que la actualización espere a que estén ready y haga rollback sola.
