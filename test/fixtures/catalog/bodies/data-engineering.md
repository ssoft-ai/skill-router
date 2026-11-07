# Data engineering

Apply this skill when data is loaded into, moved between or prepared inside databases, warehouses or file stores, and the task is bigger than a single query.

## Routing

| Task | Skill |
|---|---|
| A query is slow or holds locks | sql-query-tuning |
| A nightly or hourly copy job | etl-pipelines |
| Rules that a dataset must satisfy | data-quality-checks |
| A messy delimited file before import | csv-cleaning |
| A column or table changes in production | schema-migrations |

## Ground rules

- Know the grain. Before you join, aggregate or load, write down what one row means ("one order line per day per warehouse"). Most wrong numbers come from a join that silently changes the grain.
- Keep raw data. Land source extracts unchanged in a raw or staging zone (an S3 prefix, a `raw` schema, a bronze layer) and transform from there, so a bug can be fixed by rerunning, not by asking the source again.
- Prefer set-based SQL over row-by-row loops in Python. A `MERGE` or `INSERT ... ON CONFLICT` beats ten thousand single inserts.
- Choose file formats on purpose: Parquet or ORC for analytics (columnar, typed, compressed), JSON Lines for semi-structured events, CSV only at the edges where people or legacy systems need it.
- Partition large tables by the column most queries filter on, usually a date. Avoid thousands of tiny files; compact them.
- Every table has an owner, a description and a freshness expectation recorded in the catalog (DataHub, OpenMetadata, dbt docs).

## Steps for a new data flow

1. Identify the source, its volume per day, and how changes are detected: full snapshot, `updated_at` watermark, or change data capture (Debezium, logical replication).
2. Define the target model - staging, then dimensional (facts and dimensions) or wide tables, depending on the consumers.
3. Write the transformations as versioned code: dbt models, Spark jobs, or SQL files in the repository. No logic that only lives in a BI tool.
4. Add tests on keys and critical columns before the first production run.
5. Schedule it, record lineage, and tell the consumers where the data lives.

## Pitfalls

- Time zones: store timestamps in UTC with the zone, convert only for display.
- Floating point for money: use `DECIMAL(18,2)` or integer minor units.
- Slowly changing dimensions: decide SCD type 1 or 2 up front; retrofitting history is painful.
- PII: mask or hash personal data in non-production copies, and follow the guidance in security for access to it.

Diagrams of the data flow are drawn with diagramming.
