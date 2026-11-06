---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Перед утренним обновлением дашбордов продаж нужны автоматические проверки: в таблице customers нет NULL в email, нет дублей customer_id, а число строк отличается от вчерашнего не больше чем на 5 %; если что-то из этого нарушено, запуск должен падать.
