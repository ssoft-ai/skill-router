# SQL query tuning

Apply this skill when a query is too slow, times out, or blocks other sessions, and you need to know why before changing it.

## Measure before you touch it

1. Capture the exact statement with real parameter values, from the application log, `pg_stat_statements`, the MySQL slow query log or SQL Server Query Store.
2. Get the actual plan, not the estimate: `EXPLAIN (ANALYZE, BUFFERS)` in PostgreSQL, `EXPLAIN ANALYZE` in MySQL 8, "Include Actual Execution Plan" in SSMS. Run it on a copy with production-sized data; a plan on a dev database with 500 rows tells you nothing.
3. Record the baseline: wall time, rows returned, buffers read.

## Reading the plan

Look for the node where time or row counts jump.

| Sign | Meaning | Usual fix |
|---|---|---|
| Seq Scan / Table Scan on a large table with a selective filter | no usable index | add an index on the filter columns |
| estimated rows 10, actual 2,000,000 | stale or missing statistics | `ANALYZE`, extended statistics |
| Nested Loop with a huge outer side | wrong join strategy from a bad estimate | fix estimates, or rewrite |
| Sort spilling to disk ("external merge") | `work_mem` too small or unnecessary ORDER BY | index matching the order, raise work_mem per session |
| Key Lookup per row | index lacks covered columns | `INCLUDE` columns |

## Rewrites that help

- Make predicates sargable: `WHERE created_at >= '2026-01-01'` instead of `WHERE date(created_at) = ...`; no functions on the indexed column unless there is an expression index.
- Replace `OR` across different columns with `UNION ALL` of two indexed queries.
- Use `EXISTS` instead of `IN (subquery)` or `DISTINCT` after a join that fans out.
- Paginate with keyset (`WHERE id > :last ORDER BY id LIMIT 50`) instead of large `OFFSET`.
- Select only the columns you need; `SELECT *` defeats covering indexes.

## Indexes

Column order in a composite index matters: equality columns first, then the range column. Every index slows writes and costs disk, so check `pg_stat_user_indexes` for unused ones before adding more. Create indexes on live tables with `CREATE INDEX CONCURRENTLY` (PostgreSQL) or `ONLINE = ON` (SQL Server).

## Locks

If the problem is waiting rather than working, look at `pg_locks` joined to `pg_stat_activity`, or `sys.dm_tran_locks`. Long transactions and missing indexes on foreign keys are the classic causes of lock chains.

## After the change

Rerun the plan, compare with the baseline, and keep the before/after in the pull request description. Adding the index through a migration is covered by schema-migrations. Table bloat and dead tuples in Postgres go to postgres-vacuum, and slowness outside the database to performance-profiling.
