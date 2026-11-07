# Project planning

Apply this skill when a project, a release or a larger feature has to be scoped, broken down, estimated and put on a schedule.

## Steps

1. State the goal and the definition of done in two or three sentences, with what is explicitly out of scope. Agree it with the sponsor before breaking anything down.
2. Build a work breakdown structure (WBS): split the goal into deliverables, then into tasks small enough to finish in one to three days. A task that cannot be estimated is not yet understood; add a spike (a time-boxed investigation) instead.
3. Map dependencies between tasks: finish-to-start in most cases. External dependencies - another team's API, a vendor contract, a legal sign-off - get their own line and an owner on the other side.
4. Estimate each task as a range (best, likely, worst) or with three-point PERT: `(best + 4 x likely + worst) / 6`. Have the people doing the work estimate, not the planner alone. Story points are fine for a team's own velocity, but convert to calendar time for anyone outside it.
5. Find the critical path: the longest chain of dependent tasks. It sets the earliest finish date; work off the path has slack.
6. Group tasks into milestones that each produce something demonstrable - a feature behind a flag in staging, a migrated dataset - not "backend 50% done".
7. Add buffer explicitly at milestone level (often 15-30%, more for unfamiliar work), rather than padding each task silently.
8. Write the risk register.

## Risk register

| Risk | Likelihood | Impact | Response | Owner |
|---|---|---|---|---|
| Vendor API rate limits block the import | medium | high | ask for a quota increase in week 1; batch requests | Luis |
| Key designer on leave in March | high | medium | finish design milestone before 1 March | Dana |
| Unknown legacy data quality | medium | high | profiling spike in week 1 | Sam |

Review it at every status meeting; retire, add, re-rate.

## Communicating the plan

- A roadmap view (milestones on a timeline) for stakeholders; a task board (Jira, Linear, GitHub Projects) for the team; a Gantt chart only if dependencies are dense.
- Dates as ranges until the work is understood ("late March to mid-April"), narrowing as milestones complete - the cone of uncertainty.
- Status updates: progress against milestones, changes to scope or dates with the reason, top risks, decisions needed. Red, amber, green only with an explanation.

## Pitfalls

- Planning the whole year in detail; plan the next milestone in detail and later ones coarsely.
- Ignoring integration, testing, review, deployment and documentation time.
- Committing to a date before the breakdown exists.
- Assuming people are 100% available; meetings, support and on-call take real time.
- Scope added mid-way without moving a date or removing something else.

Meeting outcomes that feed the plan are captured with meeting-notes. Pictures of the timeline or dependencies are drawn with diagramming, and a status presentation is built with slide-decks.
