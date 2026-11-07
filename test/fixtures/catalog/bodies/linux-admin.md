# Linux administration

Apply this skill when a Linux server is set up or changed - accounts, services, storage, firewall, packages - or when a service on it fails to start.

## Services with systemd

```
systemctl status nginx
journalctl -u nginx -b --no-pager -n 100
systemctl cat nginx            # unit file and drop-ins in effect
systemctl edit nginx           # create an override drop-in
systemctl daemon-reload && systemctl restart nginx
systemctl list-units --failed
```

When a unit fails to start:

1. Read `journalctl -u <unit> -xe` for the actual error, not just "exited with code 1".
2. Run the `ExecStart` command by hand as the unit's `User=` to see its output.
3. Check permissions on files it reads, ports already in use (`ss -ltnp`), missing environment (`EnvironmentFile=`), SELinux or AppArmor denials (`ausearch -m avc`, `journalctl -k | grep DENIED`).
4. Put local changes in drop-ins under `/etc/systemd/system/<unit>.d/`, never in the vendor unit under `/usr/lib/systemd/system`.

Prefer systemd timers over cron for new scheduled jobs: they log to the journal and can catch up missed runs with `Persistent=true`.

## Users and access

- Personal accounts only; no shared logins. Add with `useradd -m -s /bin/bash`, groups with `usermod -aG`.
- SSH: keys only (`PasswordAuthentication no`), `PermitRootLogin no`, and optionally `AllowGroups`. Test the new config in a second session before closing the first.
- `sudo` through files in `/etc/sudoers.d/`, edited with `visudo -f`; grant specific commands where possible.

## Disks

| Task | Command |
|---|---|
| Space by filesystem | `df -hT` |
| What fills it | `du -xh --max-depth=1 / \| sort -h`, or `ncdu -x /` |
| Deleted files still held open | `lsof +L1` |
| Block devices | `lsblk -f` |
| Grow an LVM volume | `lvextend -r -L +20G /dev/vg0/data` |
| Mount at boot | `/etc/fstab` with `UUID=`, test with `mount -a` |

Full disks are often log files: configure `logrotate` and journald's `SystemMaxUse=`.

## Firewall

Use the distribution's front end consistently - `ufw` on Ubuntu, `firewalld` on RHEL and Fedora, or nftables rules directly. Default deny inbound; allow SSH before enabling the firewall on a remote host. Restrict management ports to the admin network.

## Packages and updates

- `apt update && apt upgrade` or `dnf upgrade`; enable `unattended-upgrades` or `dnf-automatic` for security updates.
- Check whether a reboot is needed (`/var/run/reboot-required`, `needs-restarting -r`) and schedule it.
- Pin or hold packages only with a written reason (`apt-mark hold`).
- Keep configuration in an automation tool (Ansible, Salt, cloud-init) so a server can be rebuilt instead of repaired by hand.

## Pitfalls

- Editing config on the server without recording it anywhere.
- `chmod -R 777` to fix a permissions error.
- Time not synchronised; enable `chrony` or `systemd-timesyncd`.

Scripts for these tasks follow shell-scripts. Certificates for the server come from tls-certificates, backups of its data from backup-restore, and production procedures from operations.
