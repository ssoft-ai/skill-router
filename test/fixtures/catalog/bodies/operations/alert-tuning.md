# Alert tuning

Apply this skill when the on-call rotation is paged too often, pages are ignored or acknowledged without action, or real problems were not paged at all.

## What deserves a page

A page wakes a person. It is justified only when all three hold:

1. Users are affected now or will be soon.
2. A human must act; automation cannot.
3. The action cannot wait until working hours.

Everything else is a ticket, a dashboard, or a daily digest.

## Steps

1. Export the last 30 days of pages from PagerDuty, Opsgenie or Alertmanager. For each alert rule record: count, how many led to action, median time to acknowledge, and how many fired outside hours.
2. Classify each rule: actionable, noisy (fires often, rarely needs action), flapping, duplicate, or symptomless (a cause with no user impact, such as CPU at 85%).
3. Replace cause-based alerts with symptom-based ones on the SLO: error rate, latency and availability as users see them.
4. Use multi-window, multi-burn-rate alerts on the error budget. For a 99.9% SLO a common pair is: page when the burn rate exceeds 14.4 over 1 h and 5 min windows; open a ticket when it exceeds 6 over 6 h and 30 min.
5. Add `for:` durations so a single scrape does not page, and hysteresis so an alert does not flap around the threshold.
6. Group and inhibit in Alertmanager: one page per incident, not one per pod; suppress downstream alerts when the upstream dependency is already alerting.
7. Attach a runbook link and a dashboard link to every paging rule. No runbook, no page.
8. Review the result after two weeks with the on-call engineers.

## Example rule (Prometheus)

```yaml
- alert: CheckoutErrorBudgetBurn
  expr: |
    (sum(rate(http_requests_total{job="checkout",code=~"5.."}[1h]))
     / sum(rate(http_requests_total{job="checkout"}[1h]))) > (14.4 * 0.001)
  for: 2m
  labels: { severity: page }
  annotations:
    runbook_url: https://runbooks.example/checkout-errors
```

## Metrics of a healthy rotation

- Fewer than about two pages per on-call shift on average.
- Most pages lead to an action or a follow-up ticket.
- Pages outside hours tracked separately; they cost the most.

## Pitfalls

- Deleting an alert without checking what it was the only signal for.
- Static thresholds on metrics with strong daily seasonality.
- Alerts routed to a channel nobody owns.

Writing the runbook steps for an incident uses incident-response, finding the signal in logs uses log-analysis, and the overall monitoring setup sits under operations.
