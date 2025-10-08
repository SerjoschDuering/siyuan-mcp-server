# Multi-Tenant MCP Server Setup

**✅ Your MCP server now supports multiple users!**

Each user connects to **their own SiYuan instance** by providing both:
1. Their SiYuan API token
2. Their SiYuan API URL

## Architecture

```
User 1 (Token1 + URL1) → MCP Server → User 1's SiYuan
User 2 (Token2 + URL2) → MCP Server → User 2's SiYuan
You   (TokenN + URLN) → MCP Server → Your SiYuan
```

**No user data is stored on the server** - everything comes from request headers.

---

## Required Configuration Changes

### 1. Update Your Caddyfile

Add to your Caddyfile on the Hetzner server (`/etc/caddy/Caddyfile` or similar):

```caddy
mcp.run8n.xyz {
    handle /siyuan* {
        reverse_proxy siyuan-mcp:3000 {
            # CRITICAL: Pass both headers through
            header_up X-SiYuan-Token {header.X-SiYuan-Token}
            header_up X-SiYuan-URL {header.X-SiYuan-URL}

            # Enable streaming for MCP
            flush_interval -1
        }
    }
}
```

After updating, reload Caddy:
```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 2. Update Docker Compose (Optional)

Remove the `SIYUAN_API_URL` environment variable from your `docker-compose.yml`:

```yaml
services:
  siyuan-mcp:
    image: ghcr.io/serjoschduering/siyuan-mcp-server:latest
    container_name: siyuan-mcp
    environment:
      - NODE_ENV=production
      - PORT=3000
      # ❌ REMOVE THIS LINE (no longer needed):
      # - SIYUAN_API_URL=http://siyuan:6806
    expose:
      - "3000"
    restart: unless-stopped
```

---

## Transport Support by Client

| Client | HTTP Transport | STDIO Transport |
|--------|---------------|-----------------|
| **Claude Code** | ✅ Supported | ✅ Supported |
| **Claude Desktop** | ❌ Not Supported | ✅ Supported (Only) |
| **n8n** | ✅ Supported | ❌ Not Supported |

⚠️ **Important**: Claude Desktop **only supports STDIO transport**, not HTTP!

---

## Client Configuration

### 1. Claude Desktop (STDIO Transport Only)

**⚠️ Claude Desktop does NOT support HTTP transport** - it only works with local STDIO servers.

**For local SiYuan (same machine):**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "siyuan": {
      "command": "node",
      "args": ["/absolute/path/to/siyuan-mcp-server/dist/server-stdio.js"],
      "env": {
        "SIYUAN_TOKEN": "YOUR_SIYUAN_TOKEN_HERE",
        "SIYUAN_API_URL": "http://localhost:6806"
      }
    }
  }
}
```

**Important Notes:**
- Use **absolute path** to the compiled `server-stdio.js` file
- Build the project first: `npm run build`
- Token and URL come from `env`, not `headers`
- Only works if SiYuan is on the same machine

**For remote SiYuan (advanced):**

Claude Desktop cannot directly connect to remote MCP servers. You need a local stdio-to-HTTP proxy like [minibridge](https://github.com/Acuvity/minibridge) or [mcp-remote](https://github.com/nd/mcp-remote):

```json
{
  "mcpServers": {
    "siyuan": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.run8n.xyz/siyuan"],
      "env": {
        "HTTP_HEADERS": "X-SiYuan-Token:YOUR_TOKEN,X-SiYuan-URL:http://localhost:6806"
      }
    }
  }
}
```

### 2. Claude Code (HTTP Transport Supported)

Edit `~/.config/claude/config.json`:

```json
{
  "mcpServers": {
    "siyuan": {
      "url": "https://mcp.run8n.xyz/siyuan",
      "transport": "streamable-http",
      "headers": {
        "X-SiYuan-Token": "YOUR_SIYUAN_TOKEN_HERE",
        "X-SiYuan-URL": "http://localhost:6806"
      }
    }
  }
}
```

### 3. n8n AI Agent

In your n8n workflow, configure the MCP Client node:

**Connection Settings:**
- **Server URL:** `https://mcp.run8n.xyz/siyuan`
- **Transport:** HTTP / Streamable HTTP

**Headers:**
Add two custom headers:
```
Header 1:
  Name: X-SiYuan-Token
  Value: {{$env.SIYUAN_TOKEN}}

Header 2:
  Name: X-SiYuan-URL
  Value: {{$env.SIYUAN_URL}}
```

**In n8n Environment Variables:**
```
SIYUAN_TOKEN=your-token-here
SIYUAN_URL=http://localhost:6806
```

### 4. Custom HTTP Client (Python Example)

```python
import requests

headers = {
    "X-SiYuan-Token": "YOUR_TOKEN",
    "X-SiYuan-URL": "http://localhost:6806",
    "Content-Type": "application/json"
}

response = requests.post(
    "https://mcp.run8n.xyz/siyuan",
    headers=headers,
    json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list",
        "params": {}
    }
)

print(response.json())
```

### 5. Custom HTTP Client (JavaScript Example)

```javascript
const response = await fetch('https://mcp.run8n.xyz/siyuan', {
  method: 'POST',
  headers: {
    'X-SiYuan-Token': 'YOUR_TOKEN',
    'X-SiYuan-URL': 'http://localhost:6806',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  })
});

const data = await response.json();
console.log(data);
```

---

## Where to Find Your SiYuan Credentials

### SiYuan Token

1. Open SiYuan app
2. Go to **Settings** → **About**
3. Copy your **API Token**

Or find it in config:
```bash
cat ~/.config/siyuan/conf.json | grep token
```

### SiYuan URL

**Local installation:**
```
http://localhost:6806
```

**Remote/Docker installation:**
```
http://your-server-ip:6806
https://siyuan.yourdomain.com
```

**Docker internal (if n8n is in same Docker network):**
```
http://siyuan:6806
```

---

## Testing Your Configuration

### Test with curl:

```bash
curl -X POST https://mcp.run8n.xyz/siyuan \
  -H "X-SiYuan-Token: YOUR_TOKEN" \
  -H "X-SiYuan-URL: http://localhost:6806" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

**Success response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "siyuan_listNotebooks",
        "description": "...",
        ...
      },
      ...
    ]
  }
}
```

### Common Error Responses:

**Missing token:**
```json
{
  "error": "Unauthorized",
  "message": "X-SiYuan-Token header is required..."
}
```

**Missing URL:**
```json
{
  "error": "Bad Request",
  "message": "X-SiYuan-URL header is required..."
}
```

**Invalid URL format:**
```json
{
  "error": "Bad Request",
  "message": "Invalid X-SiYuan-URL format..."
}
```

---

## Security Model

### ✅ What's Secure:

1. **HTTPS Encryption** - All traffic encrypted via Caddy
2. **No Server Storage** - Token and URL never stored on MCP server
3. **Per-Request Credentials** - Each request brings its own credentials
4. **Stateless Design** - No session data persisted

### 🔐 What to Protect:

1. **Your SiYuan Token** - Treat like a password, never commit to Git
2. **Client Config Files** - Keep `config.json` files private
3. **n8n Environment Variables** - Use n8n's credential manager

### 🌐 Network Access:

**If your SiYuan is on `localhost:6806`:**
- Only works from the same machine
- n8n/Claude Code must run on same machine as SiYuan

**If your SiYuan is on a remote server:**
- Must be accessible from wherever you run the client
- Use HTTPS if SiYuan is exposed to internet
- Consider VPN/Tailscale for secure remote access

---

## Troubleshooting

### "Cannot connect to SiYuan at http://localhost:6806"

**Problem:** MCP server can't reach your SiYuan URL.

**Solutions:**
1. Check SiYuan is running: Open `http://localhost:6806` in browser
2. If using remote SiYuan, ensure it's accessible from your machine
3. If in Docker, use Docker network name instead of localhost

### "Authentication failed. Invalid SiYuan token"

**Problem:** Token is incorrect or expired.

**Solutions:**
1. Copy fresh token from SiYuan Settings → About
2. Check for extra spaces or newlines in token
3. Verify token hasn't been regenerated

### "Connection refused" in n8n

**Problem:** n8n can't reach MCP server or SiYuan.

**Solutions:**
1. If SiYuan is on localhost, use Docker network name:
   ```
   X-SiYuan-URL: http://siyuan:6806
   ```
2. Ensure both n8n and SiYuan are in same Docker network
3. Or use host network mode for n8n

---

## Migration from Old Setup

**Before (single-tenant):**
```yaml
# docker-compose.yml
environment:
  - SIYUAN_API_URL=http://siyuan:6806  # Fixed URL
```

```json
// Client config
{
  "headers": {
    "X-SiYuan-Token": "YOUR_TOKEN"
  }
}
```

**After (multi-tenant):**
```yaml
# docker-compose.yml
environment:
  # SIYUAN_API_URL removed - comes from client
  - PORT=3000
```

```json
// Client config
{
  "headers": {
    "X-SiYuan-Token": "YOUR_TOKEN",
    "X-SiYuan-URL": "http://localhost:6806"  // Added
  }
}
```

---

## FAQ

**Q: Why not store the URL on the server?**
A: Multi-tenant support. Each user can connect to their own SiYuan instance.

**Q: Is the URL visible to others?**
A: No, it's encrypted via HTTPS and only visible to the MCP server during the request.

**Q: Can I still use environment variables?**
A: Only for local stdio transport. HTTP transport requires headers.

**Q: What if I have multiple SiYuan instances?**
A: Create multiple MCP server entries in your client config, each with different headers.

**Q: Does this work with SiYuan Cloud?**
A: Yes! Just use your SiYuan Cloud URL (e.g., `https://xxx.siyuan.cloud`)

---

**Need help?** Open an issue at: https://github.com/SerjoschDuering/siyuan-mcp-server/issues
