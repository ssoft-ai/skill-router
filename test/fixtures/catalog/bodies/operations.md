# Operations

Apply this skill to work on a service that is already running for users: deploying it, watching it, recovering it, or carrying the on-call pager for it.

## Routing

| Situation | Skill |
|---|---|
| Users are affected right now | incident-response |
| Evidence is only in logs | log-analysis |
| Workloads on a Kubernetes cluster | kubernetes-deployments |
| Data must survive loss | backup-restore |
| Pager noise | alert-tuning |
| A single host, its services and disks | linux-admin |

## Principles

- Change is the main cause of outages. Every production change is traceable: who, what, when, from which commit. Deploys go through the pipeline, not from a laptop.
- Small, frequent, reversible releases. A rollback path is known before the deploy starts; feature flags separate deploy from release.
- Observe the four golden signals for each service: latency, traffic, errors and saturation. Dashboards show them per endpoint and per dependency.
- Define service level objectives (for example 99.9% of requests under 300 ms over 28 days) and track the error budget. When the budget is spent, reliability work comes before features.
- Runbooks live next to the alert that needs them, are short, and are tested during game days.
- Automate the second time you do something by hand; toil above about half of an engineer's time is a staffing problem.

## Deploy checklist

1. Change is reviewed, CI is green, the artefact is immutable (image digest, not `latest`).
2. Database migrations are compatible with the running version.
3. Canary or staged rollout: 5%, watch metrics for a fixed period, then continue.
4. Health checks and dashboards are open during rollout.
5. Announce in the deploy channel with a link to the change.
6. Roll back on the first sign of regression; investigate afterwards.

## On-call hygiene

- Handover notes at the end of each shift: open incidents, silenced alerts, risky changes planned.
- Escalation policy in PagerDuty or Opsgenie is current, with a secondary.
- Every page gets a follow-up: fix, tune, or delete the alert.

## Pitfalls

- Friday afternoon deploys without someone on call.
- Configuration changes treated as "not a deploy" - they cause as many incidents as code.
- Shared admin accounts that make the audit trail useless.
- Capacity planned on average load instead of peak plus headroom.

Container images that are deployed come from docker-images, and the pipeline that ships them from ci-pipelines.
