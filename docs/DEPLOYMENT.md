# SiYuan MCP Server - Production Deployment Guide

**Complete guide for deploying SiYuan MCP Server in production environments**

**Last Updated**: 2025-01-09

---

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Docker Deployment](#docker-deployment)
3. [Reverse Proxy Setup](#reverse-proxy-setup)
4. [Process Management](#process-management)
5. [Multi-Tenant Setup](#multi-tenant-setup-advanced)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Deployment Overview

### Architecture Options

**Option 1: Single HTTP Server (Recommended)**
```
Internet → HTTPS (Caddy/Nginx) → MCP Server (HTTP) → SiYuan API
```
- ✅ Supports multiple clients via session management
- ✅ Stateless (client sends credentials per request)
- ✅ Easy to scale horizontally
- ✅ Production-ready with HTTPS

**Option 2: STDIO per Client (Not Recommended for Production)**
```
Client → Local STDIO Process → SiYuan API
```
- ❌ One process per client (resource intensive)
- ❌ Not suitable for remote access
- ⚠️ Only for local development

---

## Docker Deployment

### Basic Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  siyuan-mcp:
    image: ghcr.io/serjoschduering/siyuan-mcp-server:latest
    container_name: siyuan-mcp
    environment:
      - NODE_ENV=production
      - PORT=3000
      # IMPORTANT: Do NOT set SIYUAN_TOKEN or SIYUAN_API_URL here
      # Tokens come from client headers (X-SiYuan-Token, X-SiYuan-URL)
    expose:
      - "3000"
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Optional: Auto-update with Watchtower
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300 --cleanup --label-enable
    restart: unless-stopped

networks:
  app-network:
    name: app-network
    driver: bridge
```

### Build Custom Docker Image

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy built files
COPY dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]
```

### Deploy

```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f siyuan-mcp

# Check health
curl http://localhost:3000/health
```

---

## Reverse Proxy Setup

### Why You Need a Reverse Proxy

- ✅ **HTTPS/TLS**: Encrypt traffic (required for security)
- ✅ **Domain routing**: Use friendly URLs
- ✅ **Header management**: Preserve authentication headers
- ✅ **Load balancing**: Distribute traffic across instances
- ✅ **Auto SSL**: Automatic certificate management

### Caddy (Recommended - Easiest)

**Caddyfile** (`/etc/caddy/Caddyfile`):

```caddy
# Single MCP server
mcp.yourdomain.com {
    reverse_proxy siyuan-mcp:3000 {
        # CRITICAL: Preserve authentication headers
        header_up X-SiYuan-Token {header.X-SiYuan-Token}
        header_up X-SiYuan-URL {header.X-SiYuan-URL}

        # Enable streaming for MCP
        flush_interval -1
    }
}

# Multiple MCP servers with path-based routing
mcp.yourdomain.com {
    # Route /siyuan/* to SiYuan MCP
    handle /siyuan/* {
        uri strip_prefix /siyuan
        reverse_proxy siyuan-mcp:3000 {
            header_up X-SiYuan-Token {header.X-SiYuan-Token}
            header_up X-SiYuan-URL {header.X-SiYuan-URL}
            header_up Mcp-Session-Id {header.Mcp-Session-Id}
            flush_interval -1
        }
    }

    # Route /s3/* to S3 MCP
    handle /s3/* {
        uri strip_prefix /s3
        reverse_proxy s3-mcp:3001 {
            header_up X-S3-Credentials {header.X-S3-Credentials}
            header_up Mcp-Session-Id {header.Mcp-Session-Id}
            flush_interval -1
        }
    }
}
```

**Reload Caddy:**
```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### Nginx

**nginx.conf** (`/etc/nginx/sites-available/mcp`):

```nginx
upstream siyuan_mcp {
    server siyuan-mcp:3000;
}

server {
    listen 80;
    server_name mcp.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mcp.yourdomain.com;

    # SSL certificate (use certbot or manual)
    ssl_certificate /etc/letsencrypt/live/mcp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location /siyuan {
        proxy_pass http://siyuan_mcp;

        # Preserve authentication headers
        proxy_set_header X-SiYuan-Token $http_x_siyuan_token;
        proxy_set_header X-SiYuan-URL $http_x_siyuan_url;
        proxy_set_header Mcp-Session-Id $http_mcp_session_id;

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Enable streaming
        proxy_buffering off;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    location /health {
        proxy_pass http://siyuan_mcp/health;
    }
}
```

**Enable and reload:**
```bash
sudo ln -s /etc/nginx/sites-available/mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Process Management

### PM2 (Recommended for Node.js)

```bash
# Install PM2 globally
npm install -g pm2

# Start server with PM2
pm2 start dist/server.js --name siyuan-mcp \
  --env production \
  --instances 1 \
  --max-memory-restart 500M

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

**PM2 ecosystem.config.js:**

```javascript
module.exports = {
  apps: [{
    name: 'siyuan-mcp',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    watch: false
  }]
};
```

```bash
# Start with config
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs siyuan-mcp

# Restart
pm2 restart siyuan-mcp
```

### systemd (Linux Native)

Create `/etc/systemd/system/siyuan-mcp.service`:

```ini
[Unit]
Description=SiYuan MCP Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/siyuan-mcp-server
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=siyuan-mcp

Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable siyuan-mcp
sudo systemctl start siyuan-mcp
sudo systemctl status siyuan-mcp

# View logs
sudo journalctl -u siyuan-mcp -f
```

---

## Multi-Tenant Setup (Advanced)

### Architecture

The HTTP server natively supports multiple users connecting to their own SiYuan instances:

```
User 1 (Token1 + URL1) → MCP Server → User 1's SiYuan
User 2 (Token2 + URL2) → MCP Server → User 2's SiYuan
User N (TokenN + URLN) → MCP Server → User N's SiYuan
```

**Key Points:**
- ✅ No user data stored on server
- ✅ Each request brings credentials via headers
- ✅ Complete session isolation
- ✅ No server configuration per user
- ✅ Stateless design

### Required Configuration

#### 1. Update Caddyfile

Ensure headers are preserved:

```caddy
mcp.yourdomain.com {
    handle /siyuan* {
        reverse_proxy siyuan-mcp:3000 {
            # CRITICAL: Pass both headers through
            header_up X-SiYuan-Token {header.X-SiYuan-Token}
            header_up X-SiYuan-URL {header.X-SiYuan-URL}

            # Enable streaming
            flush_interval -1
        }
    }
}
```

#### 2. Docker Compose

**Important**: Do NOT set `SIYUAN_API_URL` environment variable!

```yaml
services:
  siyuan-mcp:
    image: ghcr.io/serjoschduering/siyuan-mcp-server:latest
    environment:
      - NODE_ENV=production
      - PORT=3000
      # ❌ REMOVE THESE - they come from client headers:
      # - SIYUAN_API_URL=http://siyuan:6806
      # - SIYUAN_TOKEN=xxx
    expose:
      - "3000"
    restart: unless-stopped
```

### User Configuration Examples

**User 1: Local SiYuan**
```json
{
  "headers": {
    "X-SiYuan-Token": "user1-token-abc123",
    "X-SiYuan-URL": "http://localhost:6806"
  }
}
```

**User 2: Remote SiYuan**
```json
{
  "headers": {
    "X-SiYuan-Token": "user2-token-xyz789",
    "X-SiYuan-URL": "https://siyuan.user2-server.com"
  }
}
```

**User 3: Docker Network**
```json
{
  "headers": {
    "X-SiYuan-Token": "user3-token-def456",
    "X-SiYuan-URL": "http://user3-siyuan:6806"
  }
}
```

### Header Format Options

**Format 1: Separate Headers** (Recommended)
```
X-SiYuan-Token: your-token-here
X-SiYuan-URL: http://localhost:6806
```

**Format 2: Combined Header** (n8n official MCP Client Tool)
```
X-SiYuan-Credentials: token=your-token-here,url=http://localhost:6806
```

Both formats are supported!

### Security Implications

**✅ What's Secure:**
- HTTPS encryption protects headers in transit
- Server never stores credentials
- Session isolation prevents cross-user access
- Stateless design (no persistent state)

**🔐 What to Protect:**
- User tokens (treat like passwords)
- Client configuration files
- n8n environment variables
- Reverse proxy logs (may contain headers)

**🌐 Network Access:**
- Users' SiYuan instances must be accessible from their client machines
- If using `localhost`, client must run on same machine as SiYuan
- For remote SiYuan, use HTTPS and consider VPN/Tailscale

---

## Monitoring & Health Checks

### Health Endpoint

The server provides a `/health` endpoint:

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-09T10:30:00.000Z"
}
```

### Docker Health Checks

Already included in docker-compose example:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Monitoring with Prometheus

**prometheus.yml:**

```yaml
scrape_configs:
  - job_name: 'siyuan-mcp'
    static_configs:
      - targets: ['mcp.yourdomain.com:3000']
    metrics_path: '/metrics'  # If you add metrics endpoint
    scrape_interval: 30s
```

### Log Aggregation

**Docker Logging Driver:**

```yaml
services:
  siyuan-mcp:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**View logs:**
```bash
docker logs -f --tail 100 siyuan-mcp
```

---

## Security Best Practices

### 1. Always Use HTTPS

```caddy
# ✅ Correct
mcp.yourdomain.com {
    reverse_proxy ...
}

# ❌ Wrong - HTTP exposes tokens
http://mcp.yourdomain.com {
    reverse_proxy ...
}
```

### 2. Never Store Tokens Server-Side

```yaml
# ❌ Wrong - token in environment
services:
  siyuan-mcp:
    environment:
      - SIYUAN_TOKEN=abc123  # BAD!

# ✅ Correct - no tokens
services:
  siyuan-mcp:
    environment:
      - PORT=3000  # Good!
```

### 3. Limit Exposure

Use firewall rules to restrict access:

```bash
# Only allow HTTPS
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp  # Don't expose MCP directly
```

### 4. Use Strong Tokens

Generate strong SiYuan tokens:
- Minimum 32 characters
- Mix of letters, numbers, symbols
- Regenerate periodically

### 5. Monitor Access Logs

```bash
# Caddy access logs
docker logs caddy | grep "X-SiYuan"

# Nginx access logs
sudo tail -f /var/log/nginx/access.log | grep "X-SiYuan"
```

### 6. Rate Limiting

**Caddy:**
```caddy
mcp.yourdomain.com {
    rate_limit {
        zone mcp_limit {
            key {remote_host}
            events 100
            window 1m
        }
    }
    reverse_proxy siyuan-mcp:3000
}
```

**Nginx:**
```nginx
limit_req_zone $binary_remote_addr zone=mcp_limit:10m rate=100r/m;

server {
    location /siyuan {
        limit_req zone=mcp_limit burst=20;
        proxy_pass http://siyuan_mcp;
    }
}
```

---

## Troubleshooting

### Server Won't Start

**Check logs:**
```bash
# Docker
docker logs siyuan-mcp

# PM2
pm2 logs siyuan-mcp

# systemd
sudo journalctl -u siyuan-mcp -n 50
```

**Common issues:**
- Port 3000 already in use
- Missing node_modules (run `npm install`)
- Permissions error (check file ownership)

### HTTPS Certificate Issues

**Caddy:**
```bash
# Check certificate status
docker exec caddy caddy trust

# Force renewal
docker exec caddy caddy reload --force
```

**Let's Encrypt (Nginx):**
```bash
# Renew certificate
sudo certbot renew --nginx

# Check expiry
sudo certbot certificates
```

### High Memory Usage

**Monitor:**
```bash
# Docker
docker stats siyuan-mcp

# PM2
pm2 monit
```

**Solutions:**
- Set memory limits in docker-compose
- Use PM2 `--max-memory-restart 500M`
- Check for memory leaks in application

### Clients Can't Connect

**Check network:**
```bash
# Test from client machine
curl -I https://mcp.yourdomain.com/health

# Test headers
curl -X POST https://mcp.yourdomain.com/siyuan/mcp \
  -H "X-SiYuan-Token: test" \
  -H "X-SiYuan-URL: http://localhost:6806" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

**Common issues:**
- Firewall blocking port 443
- DNS not pointing to server
- SSL certificate not valid
- Headers not being forwarded by proxy

---

## GitHub Actions Auto-Deploy

### Workflow Example

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install and build
        run: |
          npm ci
          npm run build

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/siyuan-mcp-server
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

---

## Next Steps

1. **Choose deployment method** (Docker recommended)
2. **Setup reverse proxy** with HTTPS (Caddy recommended)
3. **Configure monitoring** and health checks
4. **Test with real clients** (see [CONFIGURATION.md](./CONFIGURATION.md))
5. **Setup auto-deploy** with GitHub Actions (optional)

---

**Need more help?**
- Configuration Guide: [CONFIGURATION.md](./CONFIGURATION.md)
- User Guide: [USER_GUIDE.md](./USER_GUIDE.md)
- Open an issue: https://github.com/SerjoschDuering/siyuan-mcp-server/issues
