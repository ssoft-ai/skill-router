# Docker images

Apply this skill when a Dockerfile or Containerfile is written or changed, or when an image is too large, slow to build, or flagged by a scanner.

## Multi-stage builds

Build in one stage, ship only the result in another:

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:22.11-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM gcr.io/distroless/nodejs22-debian12
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER nonroot
EXPOSE 8080
CMD ["dist/server.js"]
```

## Rules

- Pin the base image to a specific version, and for reproducible builds to a digest (`node:22.11-bookworm-slim@sha256:...`). Let Renovate or Dependabot bump it.
- Pick a small base: `-slim`, Alpine (mind musl libc differences), distroless, Chainguard, or `scratch` for static Go and Rust binaries.
- Order instructions from least to most frequently changing so the layer cache works: system packages, dependency manifests, dependency install, then source.
- Use a `.dockerignore` (`.git`, `node_modules`, build outputs, `.env`) to keep the build context small and secrets out.
- Combine `apt-get update` and `apt-get install --no-install-recommends` in one `RUN` and remove `/var/lib/apt/lists/*` in the same layer.
- Run as a non-root user (`USER 10001`), and keep the filesystem read-only at runtime where possible.
- Use exec form for `CMD`/`ENTRYPOINT` so the process gets signals; add `tini` or `--init` if the process does not reap children.
- Never pass secrets with `ARG` or `ENV`; they end up in the image history. Use BuildKit secret mounts (`RUN --mount=type=secret,id=npmrc`).
- Add OCI labels (`org.opencontainers.image.source`, `.revision`, `.version`).

## Diagnosing size and speed

| Tool | Shows |
|---|---|
| `docker history --no-trunc image` | size per layer and the command that made it |
| dive | file-level contents of each layer, wasted space |
| `docker buildx build --progress=plain` | which steps miss the cache |
| Trivy, Grype, Docker Scout | CVEs in OS packages and libraries |

Files deleted in a later layer still occupy space in the earlier one; delete in the same `RUN` that created them.

## Multi-architecture

Build `linux/amd64` and `linux/arm64` with `docker buildx build --platform` and push a manifest list. Emulated builds under QEMU are slow; use native runners or cross-compilation in the build stage.

## Pitfalls

- `latest` tags in production manifests.
- `COPY . .` before dependency install, invalidating the cache on every change.
- Health checks that depend on tools not present in distroless images.

The image is deployed per kubernetes-deployments and built in the pipeline per ci-pipelines. Vulnerable packages found by the scanner are triaged with dependency-audit.
