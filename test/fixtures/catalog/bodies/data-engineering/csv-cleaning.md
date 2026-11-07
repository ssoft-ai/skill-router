# CSV cleaning

Apply this skill when a delimited text file fails to import, imports with shifted columns, or shows mangled characters such as "MÃ¼ller" instead of "Müller".

## Inspect first

Never open the file in a spreadsheet to "have a look" and save it: Excel rewrites dates, strips leading zeros from postcodes and IDs, and may change the encoding.

1. Check the bytes: `file data.csv`, `head -c 300 data.csv | xxd`. Look for a UTF-8 BOM (`EF BB BF`), UTF-16 (`FF FE`), or Windows-1252 bytes such as `0x92` for a curly apostrophe.
2. Check line ends: `\r\n` (CRLF), `\n`, or a stray `\r` alone. Mixed endings break some parsers.
3. Detect the delimiter: comma, semicolon (common in locales where comma is the decimal separator), tab, or pipe. Python's `csv.Sniffer` or `csvkit`'s `csvstat` help.
4. Count fields per line: `awk -F';' '{print NF}' data.csv | sort | uniq -c`. Lines with extra fields usually contain an unquoted delimiter or a newline inside a quoted value.

## Repair steps

1. Convert encoding to UTF-8 without BOM: `iconv -f WINDOWS-1252 -t UTF-8 in.csv > out.csv`, or `chardet`/`charset-normalizer` to guess when unknown. For files already double-encoded (mojibake), the `ftfy` library can reverse it.
2. Normalise line endings: `dos2unix` or `sed 's/\r$//'`.
3. Parse with a real CSV parser (Python `csv`, pandas `read_csv`, `xsv`, DuckDB `read_csv_auto`), never with `split(',')`. RFC 4180 quoting: fields with delimiters, quotes or newlines are wrapped in double quotes, and inner quotes are doubled (`""`).
4. Read every column as string first (`dtype=str` in pandas) so nothing is coerced; convert types explicitly afterwards.
5. Normalise dates to ISO 8601 (`2026-03-07`). Ambiguous inputs like `03/07/2026` need the source's locale; never guess per row.
6. Trim whitespace, unify null markers (`""`, `NULL`, `N/A`, `-`) to one representation.
7. Write the clean file with explicit options: UTF-8, `\n`, comma delimiter, minimal quoting, header row.

## Checklist before import

- [ ] Row count in equals row count out (plus or minus rejected rows, which are logged)
- [ ] Header names are unique and stable
- [ ] Leading zeros preserved in ID and postcode columns
- [ ] Decimal separator consistent
- [ ] A sample of non-ASCII names checked by eye

## Pitfalls

- Excel's "CSV UTF-8" adds a BOM; some loaders treat it as part of the first column name.
- Fields beginning with `=`, `+`, `-` or `@` can execute as formulas when the cleaned file is opened in a spreadsheet (CSV injection); prefix them with `'` if people will open it.
- Scientific notation like `1.2E+15` in an ID column means it already passed through Excel; ask for a new export.

Patterns for extracting or fixing values are written with regex-help. The scheduled job that imports the file is covered by etl-pipelines, and checks on the imported table by data-quality-checks.
