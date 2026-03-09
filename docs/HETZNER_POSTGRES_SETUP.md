# PostgreSQL on Hetzner Cloud: Complete Setup Guide

This guide shows how to deploy a production-ready PostgreSQL instance on Hetzner Cloud and connect it to this project.

## 1. Recommended Architecture

For this project, use:

- One app server (web + worker)
- One dedicated PostgreSQL server
- One private Hetzner Cloud Network between them
- Optional separate Redis server

This keeps PostgreSQL off the public internet and reduces data risk.

## 2. Prerequisites

- Hetzner Cloud account
- SSH key uploaded to Hetzner
- Ubuntu 24.04 LTS or Debian 12 server image
- Domain not required (private networking is enough)

## 3. Provision in Hetzner Cloud

In Hetzner Cloud Console:

1. Create a project.
2. Create a private network (for example `10.10.0.0/16`).
3. Create PostgreSQL server:
   - Location: same as app server
   - Type: start with at least 2 vCPU / 4 GB RAM
   - Image: Ubuntu 24.04 or Debian 12
   - Networking: attach to the private network
   - Public IPv4: optional (needed only for admin SSH; can be removed later if using VPN/jump host)
4. Add a Hetzner Cloud Firewall:
   - Allow SSH (`22`) only from your admin IP
   - Allow PostgreSQL (`5432`) only from app server private IP/CIDR
   - Deny everything else inbound
5. Attach a Hetzner Volume for database data (recommended).

## 4. Initial Server Hardening

SSH to DB server:

```bash
ssh root@<db-server-ip>
```

Create admin user and disable root password login:

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Update packages:

```bash
apt update && apt upgrade -y
timedatectl set-timezone UTC
```

## 5. Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

Check version:

```bash
sudo -u postgres psql -c "select version();"
```

## 6. (Recommended) Move Data to Hetzner Volume

If you attached a volume, mount it and move Postgres data there.

Find the PostgreSQL major version:

```bash
PG_MAJOR=$(ls /etc/postgresql | sort -nr | head -n1)
echo $PG_MAJOR
```

Format and mount the volume (replace device path if different):

```bash
mkfs.ext4 /dev/disk/by-id/scsi-0HC_Volume_<YOUR_VOLUME_NAME_OR_ID>
mkdir -p /var/lib/postgresql-data
mount /dev/disk/by-id/scsi-0HC_Volume_<YOUR_VOLUME_NAME_OR_ID> /var/lib/postgresql-data
```

Persist mount in `/etc/fstab`:

```bash
blkid /dev/disk/by-id/scsi-0HC_Volume_<YOUR_VOLUME_NAME_OR_ID>
```

Add:

```text
UUID=<uuid-from-blkid> /var/lib/postgresql-data ext4 defaults,nofail 0 2
```

Move cluster:

```bash
systemctl stop postgresql
rsync -a /var/lib/postgresql/$PG_MAJOR/main/ /var/lib/postgresql-data/
mv /var/lib/postgresql/$PG_MAJOR/main /var/lib/postgresql/$PG_MAJOR/main.bak
ln -s /var/lib/postgresql-data /var/lib/postgresql/$PG_MAJOR/main
chown -R postgres:postgres /var/lib/postgresql-data
systemctl start postgresql
```

## 7. Configure Network and Auth

Get config paths:

```bash
sudo -u postgres psql -tAc "show config_file;"
sudo -u postgres psql -tAc "show hba_file;"
```

Edit `postgresql.conf`:

- `listen_addresses = '<db-private-ip>,127.0.0.1'`
- `password_encryption = scram-sha-256`

Edit `pg_hba.conf` and allow only app host(s):

```text
# Replace 10.10.1.20 with your app server private IP
host    all    all    10.10.1.20/32    scram-sha-256
```

Reload:

```bash
systemctl restart postgresql
```

## 8. Create App Database and User

Generate strong password:

```bash
openssl rand -base64 32
```

Create role and database:

```bash
sudo -u postgres psql
```

```sql
CREATE ROLE seo_spider WITH LOGIN PASSWORD '<STRONG_PASSWORD>';
CREATE DATABASE seo_spider OWNER seo_spider;
GRANT ALL PRIVILEGES ON DATABASE seo_spider TO seo_spider;
\q
```

Test from DB server:

```bash
psql "postgresql://seo_spider:<STRONG_PASSWORD>@127.0.0.1:5432/seo_spider" -c "select now();"
```

## 9. Connect This Project

Update `apps/web/.env`:

```env
DATABASE_URL=postgresql://seo_spider:<STRONG_PASSWORD>@<DB_PRIVATE_IP>:5432/seo_spider
REDIS_HOST=<REDIS_PRIVATE_IP_OR_HOST>
REDIS_PORT=6379
```

Update worker env similarly (`apps/worker/.env` if you use one, or deployment env vars):

```env
DATABASE_URL=postgresql://seo_spider:<STRONG_PASSWORD>@<DB_PRIVATE_IP>:5432/seo_spider
REDIS_HOST=<REDIS_PRIVATE_IP_OR_HOST>
REDIS_PORT=6379
```

Apply schema from project root:

```bash
powershell -File .\npm.ps1 run db:push --workspace @seo-spider/web
```

Optional seed:

```bash
powershell -File .\npm.ps1 run db:seed --workspace @seo-spider/web
```

## 10. Backups and Restore

Use at least two layers:

1. Hetzner server backups/snapshots (infrastructure-level)
2. Logical PostgreSQL dumps (database-level)

Create daily dump script `/usr/local/bin/pg_backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%F_%H-%M-%S)
OUT_DIR=/var/backups/postgres
mkdir -p "$OUT_DIR"
pg_dump -U seo_spider -h 127.0.0.1 -d seo_spider -Fc > "$OUT_DIR/seo_spider_$TS.dump"
find "$OUT_DIR" -type f -mtime +7 -delete
```

Make executable and schedule:

```bash
chmod +x /usr/local/bin/pg_backup.sh
crontab -e
```

Example cron:

```text
15 2 * * * /usr/local/bin/pg_backup.sh
```

Restore test:

```bash
createdb -U postgres restore_test
pg_restore -U postgres -d restore_test /var/backups/postgres/seo_spider_<timestamp>.dump
psql -U postgres -d restore_test -c "\dt"
dropdb -U postgres restore_test
```

## 11. Operational Checks

- Verify DB listens only on expected interfaces
  - `ss -tulpn | grep 5432`
- Verify app connectivity from app server
  - `psql "postgresql://seo_spider:<pwd>@<DB_PRIVATE_IP>:5432/seo_spider" -c "select 1;"`
- Watch DB logs
  - `journalctl -u postgresql -f`

## 12. Troubleshooting

### `Can't reach database server at postgres:5432`

Your app still points to Docker hostname `postgres`. Use the Hetzner private IP in `DATABASE_URL`.

### `connection refused` on `5432`

- PostgreSQL not running
- Firewall blocking app server IP
- `listen_addresses` not set correctly

### `no pg_hba.conf entry`

Add the app server private CIDR/IP in `pg_hba.conf`, then restart PostgreSQL.

## 13. Security Minimum Checklist

- Use private network only for DB traffic
- Strong DB password, no default credentials
- Restrictive Hetzner firewall rules
- Restrictive `pg_hba.conf`
- Automated backups + restore drill
- Separate DB and app servers in production

## References

- Hetzner Cloud Volumes: https://docs.hetzner.com/cloud/volumes/overview/
- Hetzner Cloud Firewalls: https://docs.hetzner.com/cloud/firewalls/getting-started/overview/
- Hetzner Cloud Networks: https://docs.hetzner.com/cloud/networks/getting-started/creating-a-network/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
