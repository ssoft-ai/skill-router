# Meeting notes

Apply this skill when a meeting, a call, a workshop or a recorded transcript has to be turned into notes that people who were not there can act on.

## What notes are for

Notes record what the meeting changed: decisions made, work assigned, questions left open. They are not minutes of who said what. Someone who missed the meeting should know within a minute what they need to do.

## Template

```markdown
# Checkout redesign sync - 2026-11-05

Attendees: Dana (PM), Luis (backend), Mei (design), Sam (QA)
Absent: Priya (support)

## Decisions
- Guest checkout ships behind a flag in the 4.2 release.
- Address autocomplete uses the existing vendor; no new contract.

## Action items
| Owner | Action | Due |
|---|---|---|
| Luis | Add flag `guest_checkout` and default it off | 2026-11-12 |
| Mei | Final mock-ups for the error states | 2026-11-10 |
| Dana | Confirm legal review of guest data retention | 2026-11-14 |

## Open questions
- Do guest orders count toward loyalty points? (Dana to ask finance)

## Notes
- Support reported 140 tickets last month about lost carts.
```

## Steps

1. Before the meeting, copy the agenda into the template so notes follow its order.
2. During, write decisions and actions as they happen, in full sentences. "Discussed pricing" is not a decision; "Annual plan stays at 10% discount" is.
3. Each action item has exactly one owner (a person, not a team) and a date. If nobody takes it, record it as an open question instead.
4. From a transcript (Zoom, Teams, Google Meet captions or an audio transcription): skim for decision language - "let's go with", "agreed", "I'll take", "can you" - and verify each against the context around it. Do not attribute statements the transcript misheard.
5. Send within 24 hours to attendees and the people affected, with the action table first. Ask for corrections by a stated time.
6. Copy action items into the tracker (Jira, Linear, GitHub Issues) and link back to the notes.

## Rules

- Neutral language; no characterisation of people's tone.
- Confidential details (salaries, personal matters, unannounced deals) stay out unless the audience is cleared for them.
- Dates absolute (2026-11-12), never "next Friday".
- Keep notes in one findable place - the team wiki, the project folder - with a consistent title format.

## Pitfalls

- Long verbatim notes nobody reads.
- Action items with "we" as the owner.
- Decisions recorded without the reason, which then get reopened next month.

The follow-up email itself is drafted with email-drafting. Turning actions into a plan with dependencies is project-planning, and a postmortem meeting's notes follow the structure in incident-response.
