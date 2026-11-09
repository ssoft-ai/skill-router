# Log analysis

Apply this skill when the cause of a failure has to be found in logs - application logs, web server access logs, system journals - and there are no better traces or metrics to start from.

## Before searching

- Pin the time window. Get the first report time and convert everything to UTC. Check that the hosts' clocks are synchronised (chrony, NTP); a skewed host reorders events.
- Pick a correlation key: request ID, trace ID (`traceparent`), session ID, order number, or client IP. Without one, correlation is by time only and much weaker.
- Know where each log goes: stdout collected by Fluent Bit or Vector, journald, files under `/var/log`, or a hosted store (Elasticsearch/OpenSearch with Kibana, Loki with Grafana, Splunk, CloudWatch Logs, Datadog).

## Steps

1. Count before reading. Plot error-level lines per minute over a day around the incident. A step change marks the start; line it up with deploys and config changes.
2. Group errors by message template, not exact text. Strip IDs and numbers so that "timeout after 3012 ms" and "timeout after 2999 ms" fall together. Most tools have a "patterns" view; on the command line:
   ```
   grep ERROR app.log | sed -E 's/[0-9a-f-]{36}/<uuid>/g; s/[0-9]+/<n>/g' | sort | uniq -c | sort -rn | head
   ```
3. Take one failing request and follow its ID across services, gateway to database. Read the lines just before the first error - the cause is usually there, not in the stack trace at the end.
4. Compare with a successful request of the same kind and note the first difference.
5. Form a hypothesis and check it against a different window or host.

## Useful queries

| Store | Example |
|---|---|
| Loki (LogQL) | `{app="checkout"} \|= "ERROR" \| json \| status >= 500` |
| Elasticsearch (KQL) | `service:checkout and level:error and not message:"health"` |
| Splunk (SPL) | `index=prod sourcetype=nginx status>=500 \| timechart span=1m count` |
| journald | `journalctl -u checkout --since "2026-11-07 09:00" -p err` |
| Access logs | `awk '$9 >= 500' access.log \| cut -d' ' -f7 \| sort \| uniq -c` |

## Pitfalls

- Sampling and rate limits in the log shipper drop exactly the burst you need.
- Multiline Java stack traces split into separate events unless the shipper joins them.
- Logs show what the code chose to log; absence of an error line is not evidence of success.
- Personal data and tokens in logs: report them through secret-scanning rather than copying them into the ticket.
- Times in local zone in one service and UTC in another.

When the logs point at a code defect, continue with debugging. If the failure is still ongoing, incident-response takes precedence over root-causing. Complex patterns for extracting fields are built with regex-help.
