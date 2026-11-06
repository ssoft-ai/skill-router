---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

Auf unserer Registrierungsseite kann man eine leere E-Mail und eine Telefonnummer mit Buchstaben abschicken, und das Backend wirft dann einen 500er; sorg dafür, dass die Felder ungültige Eingaben schon vor dem Absenden mit Hinweisen direkt am Feld ablehnen, und prüf sie auf dem Server noch einmal.
