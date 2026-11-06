---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

供应商发来的 customers_export.txt 是逗号分隔的，日期有三种不同格式，名字里夹着多余的引号，行尾有空格，表头每 1000 行重复一次；在周五导入之前把它整理成 pandas 能读进来的样子。
