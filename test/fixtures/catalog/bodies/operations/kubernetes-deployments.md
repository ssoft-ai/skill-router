# Kubernetes deployments

Apply this skill when a workload is deployed to, updated on or rolled back on a Kubernetes cluster, or when its pods do not become ready.

## Manifest essentials

Every Deployment carries:

- An image pinned by digest or immutable tag, never `latest`.
- `resources.requests` for CPU and memory (scheduling) and a memory `limit` (OOM protection). CPU limits cause throttling; set them only when the team agrees.
- `readinessProbe` that checks the app can serve, `livenessProbe` that only checks the process is not stuck, and a `startupProbe` for slow starters so liveness does not kill them during boot.
- `strategy.rollingUpdate` with `maxUnavailable: 0` and `maxSurge: 25%` for user-facing services.
- A PodDisruptionBudget and at least two replicas spread with `topologySpreadConstraints`.
- `securityContext`: `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, dropped capabilities.

Keep manifests in Git and render them with Helm or Kustomize; apply through Argo CD or Flux, or `kubectl apply` from CI. No hand edits with `kubectl edit` in production.

## Rollout and rollback

```
kubectl rollout status deploy/checkout -n shop --timeout=5m
kubectl rollout history deploy/checkout -n shop
kubectl rollout undo deploy/checkout -n shop --to-revision=41
```

With GitOps, roll back by reverting the commit; an imperative undo is overwritten at the next sync.

## Diagnosing pods

| Status | First command | Usual cause |
|---|---|---|
| `CrashLoopBackOff` | `kubectl logs <pod> --previous` | app exits on start: config, missing secret, failed migration |
| `ImagePullBackOff` | `kubectl describe pod` | wrong tag, private registry without `imagePullSecrets` |
| `Pending` | `kubectl describe pod`, events | insufficient CPU/memory, node selector, unbound PVC |
| `OOMKilled` | `kubectl get pod -o yaml` (lastState) | memory limit too low or a leak |
| Running but not Ready | readiness probe output in events | wrong probe path/port, dependency down |
| Rollout stuck | `kubectl get rs` | new ReplicaSet never ready, `progressDeadlineSeconds` exceeded |

`kubectl get events -n <ns> --sort-by=.lastTimestamp` gives the recent story. `kubectl debug` attaches an ephemeral container to a distroless pod.

## Pitfalls

- Liveness probes that call the database: a DB blip restarts every pod at once.
- ConfigMap changes do not restart pods; add a checksum annotation or use a reloader.
- `kubectl scale` on a Deployment managed by an HPA is undone within a minute.
- Secrets in plain manifests in Git; use Sealed Secrets, SOPS or an external secrets operator.

The container image itself is built per docker-images. Cluster-level outages are handled through incident-response, and the CI job that deploys belongs to ci-pipelines.
