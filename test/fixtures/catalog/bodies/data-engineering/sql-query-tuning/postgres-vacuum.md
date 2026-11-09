# PostgreSQL vacuum

Apply this skill when a Postgres table or index keeps growing although the row count does not, queries slow down over weeks, or the server log warns about transaction ID wraparound.

## Why it matters

PostgreSQL's MVCC never updates a row in place. An `UPDATE` writes a new tuple version and leaves the old one dead; a `DELETE` only marks it. VACUUM reclaims dead tuples for reuse and freezes old transaction IDs. If it falls behind, tables bloat, index scans read dead entries, and in the worst case the cluster shuts down writes to avoid XID wraparound.

## Diagnose

```sql
SELECT relname, n_live_tup, n_dead_tup,
       last_autovacuum, last_autoanalyze, autovacuum_count
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC LIMIT 20;
```

- Estimate bloat with the `pgstattuple` extension or the well-known bloat estimation queries.
- Check wraparound distance: `SELECT datname, age(datfrozenxid) FROM pg_database;` Values above about 1.5 billion need attention now.
- Look for what blocks cleanup: long-running transactions in `pg_stat_activity` (`state = 'idle in transaction'`), abandoned replication slots in `pg_replication_slots`, and prepared transactions. Any of them holds back the xmin horizon, and vacuum cannot remove tuples newer than it.

## Tune autovacuum

Defaults are made for small tables. For a large, busy table set per-table storage parameters:

```sql
ALTER TABLE events SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_vacuum_threshold = 10000,
  autovacuum_analyze_scale_factor = 0.02
);
```

Globally, consider raising `autovacuum_max_workers`, `autovacuum_vacuum_cost_limit` (or lowering `autovacuum_vacuum_cost_delay`), and `maintenance_work_mem`. Change one setting at a time and watch the effect for a few days.

## Fix existing bloat

- Plain `VACUUM (VERBOSE, ANALYZE) tablename;` makes space reusable but rarely returns it to the OS.
- `VACUUM FULL` rewrites the table and returns space, but takes an ACCESS EXCLUSIVE lock for the whole time. Avoid it on live tables.
- `pg_repack` rebuilds a table or its indexes online with only brief locks; it is the usual choice in production.
- `REINDEX CONCURRENTLY` (PostgreSQL 12+) for bloated indexes.

## Pitfalls

- Disabling autovacuum on a table "for performance" is almost always wrong.
- Updates that touch an indexed column prevent HOT updates; a lower `fillfactor` (for example 90) helps HOT on update-heavy tables.
- Emergency anti-wraparound vacuum ignores cost limits and can saturate I/O; plan freezing before it triggers.

Slow queries that are not caused by bloat go back to sql-query-tuning. Alert thresholds for dead tuples and XID age are set with alert-tuning, and server-level disk and service work with linux-admin.
