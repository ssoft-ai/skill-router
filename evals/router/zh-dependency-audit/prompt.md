---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

我们的 Next.js 应用执行 npm install 时报了 14 个漏洞，其中 3 个是 high；搞清楚按我们的用法哪些包是真的可被利用的，然后在不搞坏构建的前提下升级它们。
