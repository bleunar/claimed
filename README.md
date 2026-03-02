# CLAIMED — IT Asset Management System

A web-based IT asset management system designed for educational institutions to track and manage computer components, laboratories, departments, and personnel accounts. Built with a Flask REST API backend, React SPA frontend, and deployed via Docker Compose.

---

## Features

- **Account Management** — Role-based access control with 7 roles (admin, IT head, IT technician, department head, department staff, lab head, lab assistant)
- **Component Tracking** — Track individual computer components with full audit trails
- **Computer Sets** — Group components into computer sets assigned to locations
- **Laboratory Management** — Manage labs and their resources
- **Location Management** — Track physical locations across the institution
- **Department Management** — Organize staff and resources by department
- **Analytics & Dashboard** — Visual analytics with charts and KPIs
- **Authentication** — JWT-based auth with access/refresh tokens, CSRF protection, and session management
- **Email Services** — Account notifications via SMTP

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Bootstrap 5, Chart.js, Framer Motion |
| **Backend** | Python 3.9, Flask, Gunicorn, Flask-JWT-Extended, Flask-Limiter |
| **Database** | MySQL |
| **Cache / Rate Limiting** | Redis 7 (Alpine) |
| **Containerization** | Docker, Docker Compose |
| **Reverse Proxy** | Nginx (frontend), Nginx Proxy Manager (production) |

---

## Project Structure

```
claimed/
├── backend/                  # Flask REST API
│   ├── core/                 # App factory, database, startup checks
│   ├── endpoints/            # API routes (auth, accounts, components, etc.)
│   ├── utilities/            # Helpers (logging, OTP, activity tracker)
│   ├── templates/            # Email templates
│   ├── config.py             # Configuration (env vars + Docker secrets)
│   ├── main.py               # App entrypoint
│   ├── Dockerfile
│   └── .env / .env.template
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── api/              # Axios instance with interceptors
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # Auth and theme context providers
│   │   ├── pages/            # Page components
│   │   └── utils/            # Token manager, helpers
│   ├── nginx.conf.template   # Nginx config for serving the SPA
│   ├── Dockerfile
│   └── .env / .env.template
├── database/                 # SQL schema files
├── secrets/                  # Docker secrets (not committed)
├── docker-compose.yml
├── .env / .env.template      # Root compose variables
└── README.md
```

---

## Requirements

### Production (Docker)

- Docker Engine 20.10+
- Docker Compose v2+
- External MySQL database
- External Nginx Proxy Manager (for domain routing)
- Pre-existing Docker networks: `main-network`, `database-network`

### Local Development

- Python 3.9+
- Node.js 18+
- npm
- MySQL server
- Redis server (optional — falls back gracefully)

---

## Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd claimed
```

### 2. Configure Environment Variables

#### Root `.env` (Docker Compose interpolation)

```bash
cp .env.template .env
```

Edit `.env` and set:

```env
CORS_ORIGINS="https://your-frontend-domain.com"
```

#### Backend `.env`

```bash
cp backend/.env.template backend/.env
```

Edit `backend/.env`. Sensitive variables at the top are only needed for **local development** — in production, these are loaded from Docker secrets instead:

```env
# Sensitive (dev only — Docker secrets in production)
SECRET_KEY=<your-secret-key>
JWT_SECRET_KEY=<your-jwt-secret>
MYSQL_PASSWORD=<your-db-password>
MAIL_PASSWORD=<your-smtp-app-password>
DEFAULT_ADMIN_PASSWORD=<initial-admin-password>

# Non-sensitive
APP_ENV=development
MYSQL_HOST=localhost
MYSQL_USER=claimed
MYSQL_DB=claimed
...
```

#### Frontend `.env`

```bash
cp frontend/.env.template frontend/.env
```

Set `VITE_API_URL` to the backend's URL:

```env
# Local development
VITE_API_URL=http://localhost:9050

# Production (full backend domain)
VITE_API_URL=https://api.your-domain.com
```

> **Note:** `VITE_*` variables are baked into the JS bundle at build time. Changes require a rebuild.

### 3. Initialize the Database

Import the latest schema into your MySQL server:

```bash
mysql -u <user> -p <database_name> < database/DATABASEv4b3.sql
```

### 4. Set Up Docker Secrets (Production Only)

Create secret files in the `secrets/` directory:

```bash
cd secrets
echo "your_secret_key" > secret_key
echo "your_jwt_secret" > jwt_secret_key
echo "your_db_host" > mysql_host
echo "your_db_user" > mysql_user
echo "your_db_password" > mysql_password
echo "your_db_name" > mysql_db
echo "smtp.gmail.com" > mail_server
echo "587" > mail_server_port
echo "your_email@gmail.com" > mail_username
echo "your_app_password" > mail_password
echo "admin@example.com" > default_admin_email
echo "admin_password" > default_admin_password
```

Then generate the hidden copies used by Docker:

```bash
for file in *; do [ -f "$file" ] && cp "$file" ".$file"; done
```

### 5. Run the Application

#### Local Development

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python dev.py
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

#### Production (Docker)

Ensure the external Docker networks exist:

```bash
docker network create main-network
docker network create database-network
```

Build and start:

```bash
docker compose build
docker compose up -d
```

The services will be available at:

| Service | Internal Port | Mapped Port |
|---|---|---|
| Frontend (Nginx) | 80 | 9090 |
| Backend (Gunicorn) | 5000 | 9050 |
| Redis | 6379 | — (internal only) |

### 6. Production Domain Setup (Nginx Proxy Manager)

In production, both the frontend and backend are exposed via Nginx Proxy Manager with separate domains:

1. Create a proxy host for the **frontend** (e.g., `claimed.example.com` → `claimed_frontend:80`)
2. Create a proxy host for the **backend** (e.g., `api.claimed.example.com` → `claimed_backend:5000`)
3. Set `CORS_ORIGINS` in root `.env` to the frontend domain
4. Set `JWT_COOKIE_DOMAIN` in `backend/.env` to the shared parent domain (e.g., `.example.com`)
5. Set `VITE_API_URL` in `frontend/.env` to the backend domain and **rebuild** the frontend image

---

## API Endpoints

| Module | Prefix | Description |
|---|---|---|
| Auth | `/auth` | Login, logout, token refresh, password reset |
| Accounts | `/accounts` | User CRUD, profile management, profile pictures |
| Departments | `/departments` | Department CRUD |
| Laboratories | `/laboratories` | Lab management |
| Locations | `/locations` | Physical location tracking |
| Computer Sets | `/computersets` | Computer set management |
| Components | `/components` | Component tracking and audit |
| Analytics | `/analytics` | Dashboard KPIs and chart data |
| Health | `/health` | Container health check |