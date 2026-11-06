---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

把支付服务 v2.3 发布到我们的 EKS 集群时，新 pod 一直处于 CrashLoopBackOff，旧 pod 却照样被干掉了；改一下 manifest，让更新等到 readiness 通过再继续，并且失败时自动回滚。
