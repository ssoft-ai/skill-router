# Python style

Apply this skill when Python code is written, changed or reviewed, including packaging files such as `pyproject.toml`.

## Formatting and linting

Let tools settle formatting so reviews do not: Ruff (`ruff format` and `ruff check`) or Black plus isort plus Flake8, configured in `pyproject.toml` and run in pre-commit and CI. Follow PEP 8 for whatever the tools leave open. Line length is whatever the project configured; do not reformat unrelated lines in a change.

## Naming and imports

| Kind | Style | Example |
|---|---|---|
| module, package | lower_snake | `invoice_export.py` |
| function, variable | lower_snake | `parse_amount` |
| class, exception | CapWords | `InvoiceExporter`, `RateLimitError` |
| constant | UPPER_SNAKE | `MAX_RETRIES` |
| internal | leading underscore | `_build_query` |

Booleans read as questions (`is_active`, `has_items`). Avoid single letters except for short loops and math.

## Typing

- Annotate public functions and methods; use modern syntax (`list[str]`, `dict[str, int]`, `X | None`) for Python 3.10+.
- Check with mypy or Pyright in strict mode for new modules; `# type: ignore[code]` with the specific error code and a reason.
- `dataclasses` (`@dataclass(frozen=True, slots=True)`) or Pydantic models for structured data instead of loose dicts. `TypedDict` for JSON-shaped dicts you cannot replace. `Protocol` for duck-typed interfaces.
- `Final`, `Literal` and `Enum` for fixed values.

Imports:

- Absolute imports; group standard library, third party, local (Ruff's `I` rules sort them).
- No `from module import *`.
- Avoid import-time side effects: no network calls, no reading config files at module level.
- Break circular imports by moving the shared type, not by importing inside functions as a habit.

## Errors

- Catch specific exceptions; never bare `except:`. `except Exception` only at top-level boundaries, with logging.
- Raise with context: `raise ConfigError("missing DB_URL") from exc`.
- Define a small exception hierarchy per package (`class BillingError(Exception)`), not one class per call site.
- Use context managers (`with open(...)`, `contextlib.closing`) for resources.
- `logging.getLogger(__name__)`, not `print`, in library code; use lazy formatting `log.info("loaded %d rows", n)`.

## Packaging

- `pyproject.toml` as the single source of metadata (PEP 621), with a build backend such as hatchling, setuptools or poetry-core.
- `src/` layout so tests run against the installed package.
- Pin direct dependencies in a lockfile (uv, Poetry, pip-tools) for applications; use ranges for libraries.
- Virtual environments per project (`python -m venv .venv`, `uv venv`); never install into the system Python.

## Pitfalls

- Mutable default arguments (`def f(items=[])`).
- `datetime.now()` without a time zone; use `datetime.now(tz=UTC)`.
- Comparing to `None` with `==`.

Tests for the code follow unit-testing; restructuring is covered by refactoring, and the review itself by code-review.
