# Self-Hosting HashGram Admin Panel

This guide walks you through running the **HashGram Admin Panel** and its backing
**API server** on your own VPS using Docker Compose.

---

## Prerequisites

| Tool | Version |
|---|---|
| Docker | 24+ |
| Docker Compose | v2 (bundled with Docker Desktop / `docker compose`) |
| Open ports | 80 (HTTP), optionally 443 (HTTPS) |

---

## 1 — Clone & configure

```bash
# On your VPS
git clone <your-repo-url> hashgram
cd hashgram

# Create your env file from the example
cp .env.example .env
```

Open `.env` and fill in every value:

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | Strong password for the database |
| `DATABASE_URL` | Built from the postgres credentials — keep `@postgres:5432` as-is when using docker-compose |
| `SESSION_SECRET` | Random 64-char hex string — generate with `openssl rand -hex 32` |
| `PRIVATE_OBJECT_DIR` | Where uploaded files are stored inside the container (default `/data/uploads`) |

---

## 2 — Build the images

```bash
docker compose build
```

This builds three images:
- **`migrate`** — runs `drizzle-kit push` to create/update the database schema
- **`api`** — Express + Socket.IO backend (Node 24, single esbuild bundle)
- **`admin`** — Vite SPA served by nginx, with `/api` proxied to the API container

---

## 3 — Run database migrations (first time only)

```bash
docker compose run --rm migrate
```

Re-run this any time you pull changes that include schema updates.

---

## 4 — Start everything

```bash
docker compose up -d
```

The admin panel is now accessible at **http://your-server-ip**.

Check all containers are healthy:

```bash
docker compose ps
docker compose logs -f
```

---

## 5 — HTTPS with Let's Encrypt (recommended)

Install **nginx** or **Caddy** on the host as a reverse proxy in front of port 80.

### Option A — Caddy (easiest)

```bash
apt install caddy

# /etc/caddy/Caddyfile
admin.yourdomain.com {
    reverse_proxy localhost:80
}
```

```bash
systemctl reload caddy
```

Caddy automatically provisions and renews TLS certificates.

### Option B — nginx + certbot

```bash
apt install nginx certbot python3-certbot-nginx

# /etc/nginx/sites-available/hashgram
server {
    server_name admin.yourdomain.com;
    location / { proxy_pass http://localhost:80; }
}

certbot --nginx -d admin.yourdomain.com
```

---

## 6 — Updating

```bash
git pull
docker compose build
docker compose run --rm migrate   # if schema changed
docker compose up -d
```

---

## Architecture

```
Internet
  │  HTTPS (443)
  ▼
[Caddy / host nginx]  ← TLS termination
  │  HTTP (80)
  ▼
[admin container — nginx]
  ├── /api/*      → proxy → [api container :3001]
  ├── /socket.io  → proxy → [api container :3001]  (WebSocket)
  └── /*          → static SPA files
                         │
                    [postgres container]
                    [uploads volume]
```

---

## Environment variables reference

| Variable | Required | Default | Notes |
|---|---|---|---|
| `POSTGRES_USER` | No | `hashgram` | DB username |
| `POSTGRES_PASSWORD` | **Yes** | — | DB password |
| `POSTGRES_DB` | No | `hashgram` | DB name |
| `DATABASE_URL` | **Yes** | — | Full Postgres connection string |
| `SESSION_SECRET` | **Yes** | — | JWT signing key |
| `PRIVATE_OBJECT_DIR` | No | `/data/uploads` | Uploaded file storage path |
| `PUBLIC_OBJECT_SEARCH_PATHS` | No | `/data/uploads` | Public file search paths |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | No | _(empty)_ | Only needed for Replit Object Storage |

---

## Troubleshooting

**Admin shows blank page or 502**
```bash
docker compose logs admin   # check nginx errors
docker compose logs api     # check API startup errors
```

**Database connection refused**
- Confirm `DATABASE_URL` in `.env` uses `@postgres:5432` (the docker-compose service name)
- Run `docker compose ps postgres` to verify the DB container is healthy

**Forgot to run migrations**
```bash
docker compose run --rm migrate
docker compose restart api
```
