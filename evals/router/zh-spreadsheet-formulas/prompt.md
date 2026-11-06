---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

我们的 Excel 提成工作簿里，D 列应该从 Rates 工作表的档位表中取出每个销售的提成比例，但 VLOOKUP 大约一半的行都返回 #N/A；修好它，并且销售额落在两个档位之间时也能正确取值。
