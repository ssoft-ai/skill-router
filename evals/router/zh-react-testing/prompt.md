---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

ProductCard.tsx 的覆盖率是零；写几个 Jest spec 渲染它，验证 stock 为 0 时 'Add to cart' 按钮是禁用的，否则点击时会调用 onAdd。
