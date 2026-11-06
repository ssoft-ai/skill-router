---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Bevor die Sales-Dashboards jeden Morgen aktualisiert werden, will ich automatische Prüfungen, dass die Tabelle customers keine NULL-E-Mails, keine doppelten customer_id-Werte und eine Zeilenzahl innerhalb von 5 % von gestern hat, und der Lauf soll fehlschlagen, wenn eine davon verletzt ist.
