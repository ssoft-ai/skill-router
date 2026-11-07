# Offline sync

Apply this skill when an app must keep working without a network connection, or users report that edits made in a tunnel, on a plane or in a basement disappeared.

## Architecture

Make the local store the source of truth for the UI, and the network a background process that reconciles it with the server:

1. Local database: Room or SQLDelight on Android, Core Data or SwiftData or GRDB on iOS, SQLite or Realm across platforms, WatermelonDB or RxDB in React Native.
2. Outbox (change queue): every user change is written locally and appended to a queue table in the same transaction, with an operation ID, entity, payload and timestamp.
3. Sync worker: WorkManager on Android, `BGTaskScheduler` or a foreground loop on iOS, triggered by connectivity changes (`ConnectivityManager`, `NWPathMonitor`) and app start.
4. Pull: fetch server changes since a cursor (server-issued sequence number or change token, not the device clock).

## Conflict resolution

Decide per entity, write it down, and test it:

| Strategy | Fits | Risk |
|---|---|---|
| Last writer wins (server timestamp) | user preferences, simple fields | silently loses one edit |
| Field-level merge | forms where people edit different fields | still loses same-field edits |
| Server rejects, client shows conflict | money, inventory, legal records | needs UI for the user to resolve |
| CRDTs (Automerge, Yjs) | collaborative text, lists | complexity, storage growth |

Use version numbers or ETags on each record and send `If-Match`; the server answers 409 or 412 on a stale version.

## Rules

- Operations are idempotent: each carries a client-generated UUID, and the server ignores a repeat. Retries after a timeout must not create duplicates.
- Client-generated IDs (UUIDv7 sorts by time) so records can be created offline and referenced before sync.
- Replay the outbox in order per entity; stop and surface an error on a permanent failure instead of dropping the operation.
- Show sync state honestly: "Saved on this device", "Syncing", "Could not sync - tap to retry".
- Deletions are tombstones that sync, not row removals.

## Testing

- Airplane mode in the middle of a save, then kill the app, then reconnect.
- Two devices editing the same record offline.
- Clock set wrong on the device.
- Network Link Conditioner (iOS) or the emulator's network throttling for slow and lossy links.

## Pitfalls

- Treating "connected to Wi-Fi" as "online"; captive portals and dead networks look connected.
- Unbounded local storage growth from never-pruned history.
- Schema migrations of the local database that lose queued operations.

Server endpoints for sync (cursors, conditional requests) are designed with api-design. Local schema changes follow the reasoning in schema-migrations, and push-triggered sync uses push-notifications.
