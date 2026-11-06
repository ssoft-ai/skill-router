---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

После обновления AGP до 8.5 ./gradlew assembleRelease падает с 'Duplicate class kotlin.collections.jdk8.CollectionsJDK8Kt found in modules'; почини, чтобы APK снова собирался до завтрашней передачи в QA.
