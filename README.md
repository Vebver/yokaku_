# yokaku_  
capstone project

## Automatic Account Lock

An account locks **itself after 3 consecutive failed login attempts** (`MAX_LOGIN_ATTEMPTS` in `backend/controllers/authController.js`). There is no admin lock/unlock button — lockout is fully automatic:

- Failed attempts are counted in memory per email address (no database column is used). Three wrong passwords in a row lock the account for 15 minutes.
- A locked account is rejected before the password is checked, and login returns HTTP 403.
- A successful login or password reset clears the counter immediately.
- `POST /api/auth/login` returns `attemptsRemaining` on failed attempts so the login form can warn the user.

Because the counter lives in server memory, restarting the backend clears every lockout, and attempts are not shared across server instances. The Account Management page no longer shows lock state.

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
