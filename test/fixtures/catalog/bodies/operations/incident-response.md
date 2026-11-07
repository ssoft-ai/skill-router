# Incident response

Apply this skill from the moment someone suspects a production outage or serious degradation until the postmortem's action items are filed.

## Roles

Assign them in the first five minutes, even if one person holds two:

- Incident commander (IC): owns decisions and coordination, does not debug.
- Operations lead: investigates and applies mitigations.
- Communications lead: posts updates to the status page and stakeholders.
- Scribe: keeps the timeline in the incident document or channel.

## Steps

1. Declare. Open an incident channel (for example `#inc-2026-11-07-checkout`) and an incident document. Set severity:

| Sev | Meaning | Update interval |
|---|---|---|
| SEV1 | core service down for most users, data loss, security breach | every 30 min |
| SEV2 | major feature broken or a large group of users affected | every 60 min |
| SEV3 | minor degradation, workaround exists | as needed |

2. Assess impact: which users, which regions, since when. Use the SLO dashboards and error-rate graphs, not guesses.
3. Mitigate first. Roll back the last deploy, flip the feature flag, fail over to the other region, scale out, shed load, block the abusive client. Restoring service comes before understanding it.
4. Communicate: status page update with what users see, not internal jargon. "Some customers cannot complete payment. We are working on it. Next update 14:30 UTC."
5. Verify recovery on the same metrics that showed the problem, and watch for a recurrence window before resolving.
6. Resolve and hand off: note the time, keep the channel for follow-up.

## Postmortem

Hold it within five working days, blameless: the question is how the system allowed the failure, not who typed the command.

Template:
- Summary and impact (duration, users affected, SLO budget spent)
- Timeline with UTC timestamps (detection, declaration, mitigation, resolution)
- Contributing factors (usually several)
- What went well, where we got lucky
- Action items, each with an owner, a due date and a tracker link

Track mean time to detect (MTTD) and mean time to restore (MTTR) across incidents.

## Pitfalls

- Everyone debugging, nobody commanding.
- Silent periods: no news is read as no progress; post on schedule even when nothing changed.
- Root-causing during the outage while a rollback would have fixed it.
- Action items without owners that never close.

Digging through logs during the investigation follows log-analysis. Alerts that fired late or not at all are fixed through alert-tuning, and the postmortem meeting itself is summarised with meeting-notes.
