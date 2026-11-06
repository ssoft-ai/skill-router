---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

去年有个外包可能把 AWS access key 提交到了我们的 monorepo 里；把整个 git 历史里的凭据和 token 都找出来，再加一个 pre-commit 钩子，防止以后再发生。
