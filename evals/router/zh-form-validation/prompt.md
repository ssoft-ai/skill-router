---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

我们的注册页允许提交空邮箱和带字母的手机号，后端随后直接报 500；让这些输入框在提交前就拒绝错误输入并在旁边显示提示，服务端也再校验一遍。
