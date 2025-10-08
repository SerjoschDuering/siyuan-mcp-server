# MCP Client Setup Guide

## Quick Reference: What Works Where?

| Client | HTTP Server | STDIO Server | Your Setup |
|--------|------------|--------------|------------|
| **Claude Code** | ✅ YES | ✅ YES | Use HTTP (remote) |
| **Claude Desktop** | ❌ NO | ✅ YES | Use STDIO (local only) |
| **n8n** | ✅ YES | ❌ NO | Use HTTP (remote) |

---

## Your Deployed HTTP Server

**MCP Endpoint:** `https://mcp.run8n.xyz/siyuan/mcp`
**Health Check:** `https://mcp.run8n.xyz/siyuan/health`

**URL Structure:**
```
https://mcp.run8n.xyz/siyuan/mcp
       ↑              ↑       ↑
       │              │       └─ MCP protocol endpoint
       │              └───────── Caddy route (which container)
       └──────────────────────── Your domain
```

**How it works:**
1. Caddy sees `/siyuan/*` and routes to `siyuan-mcp` container
2. Strips `/siyuan` prefix
3. Forwards to container at `/mcp` endpoint

**Works with:**
- ✅ Claude Code
- ✅ n8n
- ❌ Claude Desktop (needs proxy)

---

## Setup Instructions

### 1. Claude Code (Easiest - Works Remote)

Add to `~/.config/claude/config.json`:

```json
{
  "mcpServers": {
    "siyuan": {
      "url": "https://mcp.run8n.xyz/siyuan/mcp",
      "transport": "streamable-http",
      "headers": {
        "X-SiYuan-Token": "YOUR_SIYUAN_TOKEN",
        "X-SiYuan-URL": "http://localhost:6806"
      }
    }
  }
}
```

**Replace:**
- `YOUR_SIYUAN_TOKEN` → Your token from SiYuan Settings → About
- `http://localhost:6806` → Your SiYuan URL

**Then:**
```bash
claude mcp reload
```

---

### 2. n8n (For Workflows)

In your n8n workflow, add **MCP Client Tool** node:

**Configuration:**
- **Server URL:** `https://mcp.run8n.xyz/siyuan/mcp`
- **Transport:** HTTP

**Custom Headers:**
Add two headers:
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
SIYUAN_TOKEN=your-actual-token
SIYUAN_URL=http://localhost:6806
```

---

### 3. Claude Desktop (Local Only)

**⚠️ Important**: Claude Desktop does NOT support remote HTTP servers!

**Option A: Local STDIO (Recommended for Local SiYuan)**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "siyuan": {
      "command": "node",
      "args": ["/absolute/path/to/siyuan-mcp-server/dist/server-stdio.js"],
      "env": {
        "SIYUAN_TOKEN": "your-token-here",
        "SIYUAN_API_URL": "http://localhost:6806"
      }
    }
  }
}
```

**Setup Steps:**
```bash
# 1. Clone and build the project
cd ~/projects
git clone https://github.com/SerjoschDuering/siyuan-mcp-server.git
cd siyuan-mcp-server
npm install
npm run build

# 2. Get absolute path
pwd  # Copy this path

# 3. Update claude_desktop_config.json with full path:
# /Users/yourname/projects/siyuan-mcp-server/dist/server-stdio.js
```

**Option B: Remote via Proxy (Advanced)**

Use a stdio-to-HTTP proxy to connect Claude Desktop to your remote server:

```bash
npm install -g mcp-remote
```

Then configure:
```json
{
  "mcpServers": {
    "siyuan": {
      "command": "mcp-remote",
      "args": ["https://mcp.run8n.xyz/siyuan/mcp"],
      "env": {
        "MCP_HEADERS": "X-SiYuan-Token:YOUR_TOKEN,X-SiYuan-URL:http://localhost:6806"
      }
    }
  }
}
```

---

## Testing Your Setup

### Test with curl (HTTP Server):

```bash
curl -X POST https://mcp.run8n.xyz/siyuan/mcp \
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

**Success:** Returns list of 52 tools

**Error responses:**
- `401 Unauthorized` → Check your token
- `400 Bad Request` → Missing X-SiYuan-URL header
- `Cannot connect to SiYuan` → Check your SiYuan URL is accessible

---

## Common Issues

### "Cannot connect to SiYuan at http://localhost:6806"

**Problem:** Your MCP server can't reach SiYuan

**Solutions:**
1. **Check SiYuan is running:**
   ```bash
   curl http://localhost:6806
   ```

2. **If SiYuan is remote:**
   Use the full URL: `https://your-siyuan.example.com`

3. **If using Docker:**
   Use Docker network name instead of localhost

### "Authentication failed. Invalid SiYuan token"

**Problem:** Token is wrong or expired

**Solutions:**
1. Get fresh token from SiYuan → Settings → About
2. Remove any spaces/newlines from token
3. Check token hasn't been regenerated

### "X-SiYuan-URL header is required"

**Problem:** Forgot to add URL header

**Solution:** Add to your client config:
```json
"headers": {
  "X-SiYuan-Token": "...",
  "X-SiYuan-URL": "http://localhost:6806"  ← Add this!
}
```

### Claude Desktop shows "No tools available"

**Problem:** Using HTTP config (not supported)

**Solution:** Use STDIO config (see Option A above)

---

## Recommended Setup (Your Use Case)

Based on your deployment:

### For Personal Use (You):
```json
// Claude Code - Remote access to your server
{
  "mcpServers": {
    "siyuan": {
      "url": "https://mcp.run8n.xyz/siyuan/mcp",
      "transport": "streamable-http",
      "headers": {
        "X-SiYuan-Token": "YOUR_PERSONAL_TOKEN",
        "X-SiYuan-URL": "http://localhost:6806"
      }
    }
  }
}
```

### For n8n Workflows (Automation):
Use the MCP Client Tool with your server URL and headers.

### For Claude Desktop (Local):
Use STDIO transport with local server build.

---

## Multi-Tenant Support

**Good news:** Your HTTP server supports multiple users!

Each user configures:
```json
{
  "headers": {
    "X-SiYuan-Token": "their-own-token",
    "X-SiYuan-URL": "their-siyuan-url"
  }
}
```

**Benefits:**
- ✅ No conflicts between users
- ✅ Each user's credentials stay private
- ✅ No server configuration needed per user

---

## Security Notes

### What's Encrypted:
- ✅ HTTPS encrypts token and URL in transit
- ✅ Caddy auto-manages SSL certificates
- ✅ Headers not visible to network sniffers

### What's NOT Stored:
- ✅ Server doesn't store tokens
- ✅ Server doesn't store URLs
- ✅ Each request brings its own credentials

### What to Protect:
- 🔐 Your SiYuan token (treat like password)
- 🔐 Config files with tokens
- 🔐 n8n environment variables

---

## Next Steps

1. **Choose your client** (Claude Code recommended for remote access)
2. **Get your SiYuan token** (Settings → About)
3. **Copy the config** from above
4. **Replace** token and URL with yours
5. **Test** with curl first
6. **Reload/Restart** your client

Need help? Check `MULTI_TENANT_SETUP.md` for detailed troubleshooting.
