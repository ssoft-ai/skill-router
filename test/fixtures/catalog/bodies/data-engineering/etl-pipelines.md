# ETL pipelines

Apply this skill when a job copies data on a schedule from one system into another, or when such a job failed partway and must be rerun safely.

## Design rules

- Idempotent: running a job twice for the same interval produces the same target state. Load into a partition or a date range and replace it (`DELETE ... WHERE load_date = :d` then insert, or `INSERT OVERWRITE PARTITION`), or upsert by a natural key with `MERGE`.
- Parameterised by interval: every run takes a logical date or a watermark, never "now". This makes backfills a loop over dates instead of new code.
- Stages with recorded boundaries: extract writes a file or a staging table, transform reads only that, load reads only the transform output. Each stage logs its input location, row count and checksum.
- Atomic publish: write to a temporary table or prefix and swap (`ALTER TABLE ... RENAME`, a view switch, or an atomic commit in Delta Lake or Iceberg) so readers never see half a load.

## Steps

1. Write down source, target, schedule, expected volume and the SLA (data ready by 06:00 UTC).
2. Choose the orchestrator the team already runs: Airflow, Dagster, Prefect, or cron plus a wrapper for small cases. Define the DAG with explicit dependencies.
3. Extract incrementally where possible (watermark on `updated_at`, CDC), and store the high-water mark only after the load commits.
4. Transform in SQL (dbt) or Spark, with tests on keys and row counts.
5. Configure retries with backoff for transient errors, and no retries for data errors.
6. Alert on failure and on lateness, with a link to the run log.

## Recovering a failed run

| Failed at | Action |
|---|---|
| extract | rerun the task; the source is unchanged |
| transform | fix the code, clear the task and downstream, rerun |
| load, partial commit | the replace-partition design makes a plain rerun safe; without it, delete by `batch_id` first |
| after publish, wrong data | rerun the affected dates as a backfill (`airflow dags backfill -s ... -e ...`) |

## Pitfalls

- `catchup=True` on a new Airflow DAG with an old `start_date` launches hundreds of runs at once.
- Watermarks on clock time miss rows committed late; overlap the window by a few minutes and deduplicate.
- Schema drift in the source breaks the load at 3 a.m.; validate columns at extract.
- Sensors that poke every 30 seconds for hours occupy worker slots; use deferrable operators.

Expectations on the loaded data are written with data-quality-checks. Messy input files go through csv-cleaning first, and target table changes through schema-migrations.
