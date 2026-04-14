# Docker Secrets Setup

This directory contains plaintext secret files used by Docker Compose to securely inject sensitive values into containers at runtime. These secrets are mounted as files at `/run/secrets/<name>` inside the backend container.

**Only highly sensitive values (passwords and keys) are stored as secrets.** Non-sensitive configuration like hostnames, ports, and usernames are stored in `backend/.env` instead.

## Setup Instructions

### 1. Create the secret files

Create a file for each secret listed below. Each file should contain **only** the secret value with no trailing newline or whitespace.

```bash
cd secrets

echo -n "your_secret_key" > secret_key
echo -n "your_jwt_secret" > jwt_secret_key
echo -n "your_db_password" > mysql_password
echo -n "your_smtp_app_password" > mail_password
echo -n "your_admin_password" > default_admin_password
```

### 2. Generate the hidden copies

Docker Compose expects the files prefixed with a dot (e.g., `.secret_key`). Run this command to create them:

```bash
for file in *; do [ -f "$file" ] && [ "$file" != "README.md" ] && cp "$file" ".$file"; done
```

### 3. Verify

Confirm that each secret has a corresponding hidden file:

```bash
ls -la .secret_key .jwt_secret_key .mysql_password .mail_password .default_admin_password
```

---

## Required Secrets

| Secret File | Description | Example |
|---|---|---|
| `secret_key` | Flask application secret key | Random string (32+ chars) |
| `jwt_secret_key` | JWT token signing key | Random string (32+ chars) |
| `mysql_password` | MySQL password | *(your database password)* |
| `mail_password` | SMTP app password | *(Gmail app password)* |
| `default_admin_password` | Initial admin account password | *(a strong password)* |

---

## Important Notes

- **Do NOT commit** secret values to version control. The `.gitignore` should exclude all hidden (dot-prefixed) files in this directory.
- In **local development**, these secrets are not needed — the backend falls back to values from `backend/.env`.
- These secrets are only used by the **backend** container. The frontend and Redis containers do not use Docker secrets.
