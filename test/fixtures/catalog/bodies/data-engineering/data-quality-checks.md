# Data quality checks

Apply this skill when a dataset must meet stated expectations before anyone uses it, or when a report has already shown numbers that cannot be true.

## What to assert

| Dimension | Example expectation |
|---|---|
| Completeness | `customer_id` is never null; null rate of `email` below 2% |
| Uniqueness | `order_id` unique; no duplicate (`user_id`, `day`) pairs |
| Validity | `status` in ('new', 'paid', 'shipped', 'cancelled'); `amount` >= 0 |
| Referential integrity | every `orders.customer_id` exists in `customers` |
| Freshness | max(`loaded_at`) within the last 26 hours |
| Volume | today's row count within 30% of the 7-day median |
| Consistency | sum of line amounts equals the order total |

Start with keys and the columns the business reports on; do not try to cover every column on day one.

## Tools

- dbt tests: `unique`, `not_null`, `accepted_values`, `relationships` in the model's YAML, plus `dbt-expectations` or `dbt_utils` for ranges and recency.
- Great Expectations or Soda for pipelines outside dbt; a checkpoint runs a suite and writes a validation report.
- Plain SQL assertions that return the offending rows also work: the check passes when the query returns zero rows.

## Steps

1. Ask the consumer which wrong values would hurt most, and write those checks first.
2. Run the checks against historical data to see the current failure rate. A check that fails on day one needs a decision: fix the data, or relax the threshold with a written reason.
3. Set severity: `error` stops the pipeline before publish; `warn` lets it continue and notifies the owner.
4. Place checks at two points - after staging (source problems) and before publish (transform bugs).
5. Store results with run ID and timestamp so trends are visible.

## Investigating impossible numbers

1. Reproduce the number with a query on the published table.
2. Check grain: count rows per key after each join in the model; a fan-out multiplies sums.
3. Check duplicates in the source extract and in late-arriving data.
4. Check filters and time zones at day boundaries.
5. Add a check that would have caught it, then fix.

## Pitfalls

- Thresholds that are too tight create alert fatigue and get ignored.
- Row-count checks on weekends and holidays need a seasonal baseline.
- Quarantining bad rows silently hides problems; report the count.

The pipeline structure itself belongs to etl-pipelines, file-level repairs to csv-cleaning, and unit tests for transformation functions to unit-testing.
