# TradePulse Backend - Dokploy Deployment Guide

This guide covers deploying the TradePulse backend to [Dokploy](https://dokploy.com), a self-hosted PaaS alternative to Heroku/Vercel.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Dokploy Server Setup](#dokploy-server-setup)
3. [Project Configuration](#project-configuration)
4. [Environment Variables](#environment-variables)
5. [Domain and SSL Setup](#domain-and-ssl-setup)
6. [Database and Redis Setup](#database-and-redis-setup)
7. [Deployment](#deployment)
8. [Auto-Deploy on Git Push](#auto-deploy-on-git-push)
9. [Health Checks](#health-checks)
10. [Monitoring and Logs](#monitoring-and-logs)
11. [Backups](#backups)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- A VPS or dedicated server (minimum 2GB RAM, 2 CPU cores recommended)
- A domain name with DNS access
- Git repository hosted on GitHub, GitLab, or similar
- Basic knowledge of Docker and Linux administration

---

## Dokploy Server Setup

### 1. Install Dokploy on Your Server

SSH into your server and run:

```bash
# Install Dokploy (one-liner installation)
curl -sSL https://dokploy.com/install.sh | sh
```

### 2. Access Dokploy Dashboard

After installation, access the Dokploy dashboard at:

```
https://your-server-ip:3000
```

Create your admin account on first access.

### 3. Configure Server Settings

1. Go to **Settings** > **Server**
2. Set your server's hostname
3. Configure email notifications (optional)

---

## Project Configuration

### 1. Create a New Project

1. In Dokploy dashboard, click **Projects** > **New Project**
2. Name it: `tradepulse-backend`
3. Description: `TradePulse Backend API`

### 2. Add Application

1. Inside the project, click **Add Service** > **Application**
2. Configure:
   - **Name**: `api`
   - **Source**: Git Repository
   - **Repository URL**: `https://github.com/your-username/trade-alert-app.git`
   - **Branch**: `main`
   - **Build Path**: `backend`

### 3. Configure Build Settings

1. Go to the application settings
2. Under **Build**:
   - **Build Type**: Dockerfile
   - **Dockerfile Path**: `Dockerfile`
   - **Docker Context**: `backend`
   - **Target Stage**: `production`

### 4. Configure Docker Compose (Alternative Method)

If using docker-compose for the full stack:

1. Add a **Compose** service instead of Application
2. Select `docker-compose.prod.yml`
3. Set build context to `backend`

---

## Environment Variables

### Required Variables

Navigate to **Application** > **Environment** and add:

```env
# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Domain
DOMAIN=api.tradepulse.app
CORS_ORIGIN=https://tradepulse.app

# Database (if using Dokploy's PostgreSQL)
DB_USER=tradepulse
DB_PASSWORD=<generate-secure-password>
DB_NAME=tradepulse
DATABASE_URL=postgresql://tradepulse:<password>@postgres:5432/tradepulse

# Redis (if using Dokploy's Redis)
REDIS_PASSWORD=<generate-secure-password>
REDIS_URL=redis://:<password>@redis:6379

# JWT (CRITICAL - generate secure random values)
JWT_SECRET=<generate-with-openssl-rand-base64-48>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-base64-48>

# OpenAI (optional)
OPENAI_API_KEY=sk-your-key

# Rate Limiting
RATE_LIMIT_MAX=100
```

### Generate Secure Passwords

Run these commands to generate secure values:

```bash
# Database password
openssl rand -base64 32

# Redis password
openssl rand -base64 32

# JWT Secret
openssl rand -base64 48

# JWT Refresh Secret
openssl rand -base64 48
```

---

## Domain and SSL Setup

### 1. Configure DNS

Add these DNS records pointing to your Dokploy server:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | api | your-server-ip | 3600 |
| AAAA | api | your-server-ipv6 | 3600 |

### 2. Configure Domain in Dokploy

1. Go to **Application** > **Domains**
2. Click **Add Domain**
3. Enter: `api.tradepulse.app`
4. Enable **HTTPS** (Let's Encrypt)
5. Click **Save**

### 3. SSL Certificate

Dokploy automatically provisions Let's Encrypt certificates when:
- DNS is properly configured
- Domain is added to the application
- HTTPS is enabled

Certificate renewal is automatic.

### 4. Force HTTPS Redirect

In **Application** > **Domains**:
- Enable **Force HTTPS Redirect**

---

## Database and Redis Setup

### Option A: Using Dokploy's Built-in Services

#### PostgreSQL

1. In your project, click **Add Service** > **Database** > **PostgreSQL**
2. Configure:
   - **Name**: `postgres`
   - **Version**: `16-alpine`
   - **Database Name**: `tradepulse`
   - **Username**: `tradepulse`
   - **Password**: (auto-generated or custom)
3. Under **Volumes**, ensure data persistence is enabled

#### Redis

1. Click **Add Service** > **Database** > **Redis**
2. Configure:
   - **Name**: `redis`
   - **Version**: `7-alpine`
   - **Password**: (custom secure password)
3. Enable **Append Only File (AOF)** for persistence

### Option B: External Managed Services

For production, consider using managed database services:

- **PostgreSQL**: Supabase, Neon, AWS RDS, DigitalOcean Managed Databases
- **Redis**: Upstash, Redis Cloud, AWS ElastiCache

Update `DATABASE_URL` and `REDIS_URL` accordingly.

---

## Deployment

### Manual Deployment

1. Go to **Application** > **Deployments**
2. Click **Deploy**
3. Monitor the build logs

### First Deployment Checklist

- [ ] Environment variables configured
- [ ] Database service running
- [ ] Redis service running
- [ ] DNS configured
- [ ] SSL certificate issued

### Run Database Migrations

After first deployment:

1. Go to **Application** > **Terminal**
2. Run:
   ```bash
   npm run migrate
   ```

Or configure as a pre-deploy hook.

---

## Auto-Deploy on Git Push

### 1. Enable Git Integration

1. Go to **Application** > **Git**
2. Connect your GitHub/GitLab account
3. Select repository and branch

### 2. Configure Webhooks

Dokploy automatically creates webhooks. Verify in your Git provider:

1. Go to repository **Settings** > **Webhooks**
2. Confirm Dokploy webhook is listed and active

### 3. Auto-Deploy Settings

1. Go to **Application** > **General**
2. Enable **Auto Deploy**
3. Set **Trigger**: `Push to main branch`

### 4. GitHub Actions Integration (Optional)

Add a deployment workflow at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Dokploy

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Dokploy Deploy
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.DOKPLOY_API_TOKEN }}" \
            "${{ secrets.DOKPLOY_WEBHOOK_URL }}"
```

---

## Health Checks

### Configure Health Checks

1. Go to **Application** > **Health Checks**
2. Add health check:
   - **Path**: `/health/live`
   - **Port**: `3000`
   - **Protocol**: `HTTP`
   - **Interval**: `30s`
   - **Timeout**: `10s`
   - **Retries**: `3`
   - **Start Period**: `40s`

### Available Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/health/live` | Liveness probe - is the app running? |
| `/health/ready` | Readiness probe - is the app ready for traffic? |
| `/health` | Combined health status |

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## Monitoring and Logs

### View Logs

1. Go to **Application** > **Logs**
2. Select log type:
   - **Build Logs**: Deployment build output
   - **Runtime Logs**: Application stdout/stderr
   - **Access Logs**: HTTP request logs

### Log Filtering

- Filter by time range
- Search for specific patterns
- Download logs for analysis

### Metrics

Monitor in **Application** > **Metrics**:

- CPU usage
- Memory usage
- Network I/O
- Request count
- Response times

### Alerts (Optional)

1. Go to **Settings** > **Notifications**
2. Configure:
   - Email alerts
   - Slack/Discord webhooks
   - PagerDuty integration

Set alerts for:
- Deployment failures
- Health check failures
- High resource usage

---

## Backups

### Database Backups

#### Automatic Backups (Recommended)

1. Go to **PostgreSQL Service** > **Backups**
2. Enable **Automatic Backups**
3. Configure:
   - **Schedule**: `0 2 * * *` (daily at 2 AM)
   - **Retention**: 7 days
   - **Storage**: Local or S3

#### Manual Backup

```bash
# Connect to Dokploy terminal
docker exec -t postgres pg_dump -U tradepulse tradepulse > backup_$(date +%Y%m%d).sql
```

### Redis Backups

Redis with AOF enabled automatically persists data. For point-in-time backup:

```bash
docker exec -t redis redis-cli -a $REDIS_PASSWORD BGSAVE
```

---

## Troubleshooting

### Common Issues

#### 1. Build Fails

**Symptoms**: Deployment stuck or fails during build

**Solutions**:
- Check build logs for errors
- Verify Dockerfile path is correct
- Ensure all build dependencies are available
- Check if there's enough disk space

```bash
# Check disk space on server
df -h
```

#### 2. Application Won't Start

**Symptoms**: Container starts but exits immediately

**Solutions**:
- Check runtime logs for errors
- Verify all environment variables are set
- Ensure database is accessible
- Check port configuration

#### 3. Database Connection Failed

**Symptoms**: `ECONNREFUSED` or timeout errors

**Solutions**:
- Verify database service is running
- Check DATABASE_URL format
- Ensure services are on the same network
- Check database credentials

#### 4. SSL Certificate Issues

**Symptoms**: Certificate not issued or expired

**Solutions**:
- Verify DNS is pointing to server
- Check Let's Encrypt rate limits
- Ensure port 80/443 is open
- Wait for DNS propagation (up to 48h)

#### 5. High Memory Usage

**Symptoms**: OOM kills, slow response

**Solutions**:
- Increase container memory limit
- Check for memory leaks in application
- Optimize database queries
- Enable Redis memory limits

### Useful Commands

```bash
# Check container status
docker ps -a

# View container logs
docker logs <container-id> --tail 100

# Access container shell
docker exec -it <container-id> /bin/sh

# Check network connectivity
docker network inspect <network-name>

# Restart service
docker-compose restart api
```

### Getting Help

- [Dokploy Documentation](https://docs.dokploy.com)
- [Dokploy Discord](https://discord.gg/dokploy)
- [GitHub Issues](https://github.com/Dokploy/dokploy/issues)

---

## Security Checklist

Before going live, verify:

- [ ] All passwords are strong (32+ characters)
- [ ] JWT secrets are unique and secure
- [ ] HTTPS is enforced
- [ ] Rate limiting is configured
- [ ] CORS is properly restricted
- [ ] Database is not publicly accessible
- [ ] Redis is password-protected
- [ ] Automatic backups are enabled
- [ ] Monitoring alerts are configured
- [ ] Environment variables are not logged
