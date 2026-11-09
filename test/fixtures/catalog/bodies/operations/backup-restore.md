# Backup and restore

Apply this skill when a backup scheme is designed or reviewed, or when nobody can say for sure that the data could be restored today.

## Targets first

For each data store, agree two numbers with its owner:

- RPO (recovery point objective): how much data, measured in time, may be lost. "Up to 15 minutes of orders."
- RTO (recovery time objective): how long until the service works again. "Within 4 hours."

These decide the method. A nightly dump cannot meet a 15-minute RPO; point-in-time recovery from continuous WAL or binlog archiving can.

## The 3-2-1 rule

Keep at least three copies of the data, on two different kinds of storage, with one copy offsite. Add one more: one copy immutable or offline (object lock, WORM bucket, tape), so ransomware or a compromised admin account cannot delete it.

## Methods by store

| Store | Method |
|---|---|
| PostgreSQL | `pg_basebackup` plus WAL archiving with pgBackRest or WAL-G for PITR; `pg_dump` for logical copies |
| MySQL | Percona XtraBackup plus binlogs |
| Files, VMs | restic, Borg, Veeam, snapshot of the volume plus offsite copy |
| Object storage | versioning plus cross-region replication |
| Kubernetes | Velero for resources and persistent volumes |
| SaaS data | export via vendor API on a schedule |

Encrypt backups at rest and in transit, and keep the encryption keys somewhere that does not share the fate of the backups.

## Retention

A typical schedule is grandfather-father-son: dailies for 14 days, weeklies for 8 weeks, monthlies for 12 months. Check legal retention and deletion obligations (GDPR erasure requests also reach backups; document how).

## Proving restores

A backup that was never restored is a hope.

1. Schedule an automated restore at least monthly into an isolated environment.
2. Verify content, not exit codes: row counts against the source, checksums, application smoke test against the restored copy.
3. Time it and compare with the RTO.
4. Once a year, run a full disaster recovery drill from the offsite copy only, with the runbook, by someone who did not write it.

## Pitfalls

- Backing up a live database by copying its data files without the engine's tooling.
- Backup jobs that fail silently; alert on missing success, not only on failure.
- Credentials for the backup bucket stored on the server being backed up.

Server disks and cron jobs are covered by linux-admin, failing-backup alerts by alert-tuning, and destructive schema changes, which deserve a fresh backup first, by schema-migrations.
