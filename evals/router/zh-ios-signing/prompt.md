---
max_turns: 6
allowed_tools: [Skill, Read, Glob, Grep, mcp__plugin_skill-router_skill-router__search_skills, mcp__plugin_skill-router_skill-router__load_skill]
---

自从我们的 distribution 证书过期后，CI Mac 上的 Xcode archive 一直报 'No profiles for com.acme.fitness were found'；重新配置证书和 provisioning profile，让 fastlane 能再次生成 .ipa。
