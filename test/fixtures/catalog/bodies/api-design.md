# API design

Apply this skill when a new HTTP endpoint is planned, an existing one changes shape, or a breaking change to a public API is considered.

## Resources and URLs

- Nouns for resources, plural collections: `/customers`, `/customers/{customerId}/invoices`. Verbs belong in HTTP methods, not paths.
- Nest at most one level; beyond that, use top-level resources with filters (`/invoices?customerId=...`).
- Actions that do not fit CRUD become sub-resources or explicit action endpoints: `POST /orders/{id}/cancellation` or `POST /orders/{id}:cancel`. Pick one style per API.
- Consistent casing: kebab-case paths, camelCase or snake_case fields - one choice, everywhere.
- IDs are opaque strings to clients, even if they are numbers inside.

## Methods and status codes

| Method | Use | Typical success |
|---|---|---|
| GET | read, safe, cacheable | 200 |
| POST | create or non-idempotent action | 201 with `Location`, or 202 for async |
| PUT | full replace, idempotent | 200 or 204 |
| PATCH | partial update (JSON Merge Patch or JSON Patch) | 200 |
| DELETE | remove, idempotent | 204 |

Errors: 400 malformed request, 401 not authenticated, 403 not allowed, 404 not found (also for objects the caller may not know exist), 409 state conflict, 412 precondition failed (ETag mismatch), 422 validation failed, 429 rate limited with `Retry-After`, 5xx only for server faults.

## Error body

Use one format for every error, such as RFC 9457 Problem Details (`application/problem+json`):

```json
{
  "type": "https://api.example.com/problems/insufficient-funds",
  "title": "Insufficient funds",
  "status": 422,
  "detail": "Balance is 30.00, the transfer needs 50.00.",
  "instance": "/transfers/7f3c",
  "errors": [{ "field": "amount", "code": "exceeds_balance" }]
}
```

Machine-readable codes for clients, human-readable text for developers. Never leak stack traces.

## Pagination, filtering, idempotency

- Cursor-based pagination (`?limit=50&cursor=...` returning `nextCursor`) for large or changing collections; offset pagination only for small, stable ones.
- Filtering and sorting by explicit, documented parameters (`?status=open&sort=-createdAt`).
- `Idempotency-Key` header on POSTs that create payments or orders, so a retried request does not duplicate.
- ETags with `If-None-Match` for caching and `If-Match` for optimistic concurrency.

## Versioning and change

- Additive changes (new optional field, new endpoint) are not breaking, provided clients ignore unknown fields.
- Breaking changes: removing or renaming a field, changing a type, tightening validation, changing a default, changing error codes. They need a new version - path (`/v2`), header or media type - and a deprecation period announced with `Deprecation` and `Sunset` headers.
- Write the OpenAPI description before the code and review it like code.

## Pitfalls

- Returning 200 with `{"success": false}`.
- Exposing database columns one-to-one as the API model.
- Timestamps without time zones; use RFC 3339 in UTC.

Reference pages for the endpoints are written with api-reference-docs. Attack surface of a new endpoint is assessed with threat-modelling, and offline-capable clients add needs described in offline-sync.
