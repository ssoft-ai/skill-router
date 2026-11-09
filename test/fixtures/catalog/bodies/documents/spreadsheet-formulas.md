# Spreadsheet formulas

Apply this skill when a workbook gives wrong totals, a formula returns `#N/A` or `#VALUE!`, or someone counts things by hand that a formula should count.

## Pick the right function

| Need | Excel 365 / Google Sheets |
|---|---|
| Look up a value by key | `XLOOKUP(key, keys, values, "not found")`; `INDEX` + `MATCH` in older Excel |
| Sum with conditions | `SUMIFS(amount, region, "North", date, ">="&DATE(2026,1,1))` |
| Count with conditions | `COUNTIFS` |
| Filter rows | `FILTER(A2:D500, C2:C500="open")` |
| Unique values | `UNIQUE`, `SORT`, `SORTBY` |
| Summary by group | PivotTable, or `QUERY` in Google Sheets, or `GROUPBY` in recent Excel |
| Reuse intermediate results | `LET(x, ..., y, ..., x*y)` |
| Date math | `EDATE`, `EOMONTH`, `NETWORKDAYS`, `DATEDIF` |

Avoid `VLOOKUP` with a hard-coded column index: inserting a column silently breaks it.

## Steps for debugging a wrong result

1. Find the first wrong cell. Use Formulas > Evaluate Formula (Excel) or select parts of the formula and press F9 to see intermediate values.
2. Trace precedents to see which ranges feed it.
3. Check types: numbers stored as text (green triangle, left-aligned) do not sum and do not match a numeric key. Fix with `VALUE` or Text to Columns, not by retyping.
4. Check ranges: a `SUMIFS` whose criteria range and sum range differ in size, or a range that stops at row 500 while data now reaches 620. Use structured references to an Excel Table (`Sales[Amount]`) so ranges grow.
5. Check invisible characters: trailing spaces and non-breaking spaces (`CHAR(160)`) from web exports defeat lookups. `TRIM(SUBSTITUTE(A2, CHAR(160), " "))`.
6. Check dates: dates stored as text, or day and month swapped by locale.

## Rules

- Inputs, calculations and outputs on separate sheets or clearly marked areas.
- No hard-coded numbers inside formulas; put rates and thresholds in named cells (`VAT_Rate`).
- Absolute references (`$B$1`) only where the reference must not move when copied.
- Wrap expected errors deliberately with `IFNA` or `IFERROR`, not every formula by reflex - that hides real errors.
- Volatile functions (`INDIRECT`, `OFFSET`, `NOW`) recalculate constantly and slow large workbooks.

## Pitfalls

- Circular references enabled with iterative calculation to "make the error go away".
- Merged cells break sorting, filtering and lookups.
- Floating point: `=0.1+0.2=0.3` is FALSE; round before comparing money.

Messy source files are fixed with csv-cleaning before they are pasted in. Charts and decks built from the workbook use slide-decks, and the general rules for shared files are in documents.
