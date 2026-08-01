# yokaku_  
capstone project

## Database Backup & Restore

The backup/restore endpoints (`POST /api/admin/backup`, `POST /api/admin/backup/restore/:filename`) support two engines:

### 1. Node engine (default) — `BACKUP_METHOD=node`

Backups and restores run **entirely through the `mysql2` driver** — no local MySQL CLI binaries are required. This is the recommended method because:

- It works on **Railway / Render managed MySQL**, which uses MySQL 8's `caching_sha2_password` authentication plugin. Old XAMPP/MariaDB CLI tools cannot connect to such databases (error 1045: `Plugin caching_sha2_password could not be loaded`).
- It works anywhere the app itself can connect to the database (local, staging, production).
- Views, triggers, and routines are included in the backup; `DEFINER=` clauses are stripped automatically so restores succeed even when the original MySQL user does not exist.

This is the default; no configuration is needed.

### 2. CLI engine (optional) — `BACKUP_METHOD=cli`

Uses the MySQL CLI tools (`mysqldump` / `mysql`).

- On most systems these are on the PATH already.
- On Windows (e.g. XAMPP), they may **not** be on the PATH. The backend will auto-detect common install locations (XAMPP, WAMP, Laragon, MySQL/MariaDB under `Program Files`).
- If auto-detection fails, set these env vars in `backend/.env`:

```
BACKUP_METHOD=cli
MYSQLDUMP_PATH=C:\xampp\mysql\bin\mysqldump.exe
MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe
```

> **Note:** The XAMPP `mysqldump.exe`/`mysql.exe` are MariaDB client tools and **cannot** back up/restore a MySQL 8 database that uses `caching_sha2_password`. If you connect to a managed MySQL 8 host (Railway/Render), keep `BACKUP_METHOD=node` (or omit it) and only use the CLI engine against local MySQL/MariaDB instances.
