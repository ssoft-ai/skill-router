# API reference documentation

Apply this skill when the reference for an HTTP API is written, regenerated, or found to disagree with what the API actually does.

## Source of truth

Generate the reference from a machine-readable description wherever possible: an OpenAPI 3.1 document (`openapi.yaml`), produced either design-first and validated against the code, or code-first from annotations (FastAPI, springdoc, Swashbuckle, tsoa). Render it with Redoc, Swagger UI, Stoplight Elements or Scalar. Hand-written reference pages drift within a release.

Lint the description with Spectral or Redocly CLI (`redocly lint openapi.yaml`) in CI, and fail the build on broken references or missing descriptions.

## What every endpoint needs

- Method and path, with a one-line summary that says what it does for the caller.
- Authentication: which scheme (OAuth 2.0 scope, API key header, bearer JWT) and which permissions.
- Path, query and header parameters: type, required or optional, default, allowed values, format (`date-time`, `uuid`).
- Request body schema with field descriptions and constraints (min, max, pattern).
- Responses: every status code the endpoint can return, with the body schema. Include 400, 401, 403, 404, 409, 422, 429 where they apply, and the error body format.
- At least one complete request and response example, runnable as a curl command with a placeholder token.
- Rate limits, pagination parameters and idempotency keys where relevant.

## Example fragment

```yaml
/v1/invoices/{invoiceId}:
  get:
    summary: Retrieve one invoice
    parameters:
      - name: invoiceId
        in: path
        required: true
        schema: { type: string, format: uuid }
    responses:
      "200": { $ref: "#/components/responses/Invoice" }
      "404": { $ref: "#/components/responses/NotFound" }
```

## Steps

1. Diff the published reference against the running API: contract tests (Schemathesis, Dredd, Prism proxy) catch undocumented fields and status codes.
2. Fill in descriptions from the caller's perspective; "The invoice ID" says nothing, "ID returned by Create invoice" helps.
3. Add examples from real, anonymised traffic.
4. Mark deprecated operations with `deprecated: true` and a sunset date.
5. Publish versioned docs: v1 and v2 side by side while both are live.

## Pitfalls

- Examples that do not validate against the schema they illustrate.
- `additionalProperties` left open, so clients rely on fields you never promised.
- Enum values added without documenting how clients should handle unknown ones.

Design decisions about resources, status codes and versioning belong to api-design. The getting-started guide for the repository is written with readme-writing, and general publishing rules are in documents.
