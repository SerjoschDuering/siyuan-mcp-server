# SiYuan MCP Server - Configuration Guide

**Complete setup and configuration reference for all clients**

**Last Updated**: 2025-01-09

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Variables](#environment-variables)
4. [Client Configuration](#client-configuration)
   - [Claude Desktop](#claude-desktop-stdio-only)
   - [Claude Code](#claude-code-http-supported)
   - [n8n](#n8n-workflows)
   - [Custom Clients](#custom-clients)
5. [Multi-Tenant Setup](#multi-tenant-setup)
6. [Security Model](#security-model)
7. [Testing](#testing-your-configuration)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up the SiYuan MCP Server, ensure you have:

1. **SiYuan Note** running locally or remotely
   - Default local URL: `http://localhost:6806`
   - Get your API token: SiYuan Settings → About → Copy API Token

2. **Node.js 18+** installed
   ```bash
   node --version  # Should show v18 or higher
   ```

3. **An MCP-compatible client**:
   - Claude Desktop (local only, STDIO transport)
   - Claude Code (supports both STDIO and HTTP)
   - n8n (HTTP only)
   - Custom HTTP client

---

## Installation

### Method 1: Local Build (Recommended)

```bash
# Clone the repository
git clone https://github.com/SerjoschDuering/siyuan-mcp-server.git
cd siyuan-mcp-server

# Install dependencies
npm install

# Build the server
npm run build
```

**Output files:**
- `dist/server-stdio.js` - For STDIO transport (Claude Desktop)
- `dist/server.js` - For HTTP transport (n8n, remote access)

### Method 2: Via Smithery (Coming Soon)

```bash
# Once published to Smithery registry:
smithery install @your-org/siyuan-mcp-server
```

---

## Environment Variables

The MCP server supports the following environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SIYUAN_API_URL` | SiYuan API endpoint URL | `http://127.0.0.1:6806` | No |
| `SIYUAN_TOKEN` | Your SiYuan API token (**STDIO mode only**) | - | For STDIO |
| `PORT` | HTTP server port | `3000` | No |
| `NODE_ENV` | Environment mode | `development` | No |

**Important Notes:**
- In **HTTP mode**, token and URL come from **client headers** (`X-SiYuan-Token`, `X-SiYuan-URL`), NOT environment variables
- In **STDIO mode**, token and URL come from **environment variables**
- Never commit tokens to version control

---

## Client Configuration

### Transport Support by Client

| Client | STDIO Transport | HTTP Transport | Recommended |
|--------|----------------|----------------|-------------|
| **Claude Desktop** | ✅ Supported | ❌ Not Supported | STDIO only |
| **Claude Code** | ✅ Supported | ✅ Supported | HTTP (remote) |
| **n8n** | ❌ Not Supported | ✅ Supported | HTTP only |

---

### Claude Desktop (STDIO Only)

**Important**: Claude Desktop only supports local STDIO transport, not remote HTTP servers.

#### Configuration File Locations

| OS | Path |
|----|------|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

#### Configuration Example

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

**Setup Steps:**

1. Build the project (see Installation above)
2. Get absolute path to `server-stdio.js`:
   ```bash
   cd /path/to/siyuan-mcp-server
   pwd  # Copy this path
   # Example: /Users/yourname/projects/siyuan-mcp-server
   ```
3. Get your SiYuan token: SiYuan → Settings → About → Copy API Token
4. Edit `claude_desktop_config.json` with the full path
5. Restart Claude Desktop

#### Remote SiYuan (Advanced)

If your SiYuan is on a remote server, use an stdio-to-HTTP proxy:

```bash
npm install -g mcp-remote
```

Then configure:
```json
{
  "mcpServers": {
    "siyuan": {
      "command": "mcp-remote",
      "args": ["https://mcp.yourdomain.com/siyuan/mcp"],
      "env": {
        "MCP_HEADERS": "X-SiYuan-Token:YOUR_TOKEN,X-SiYuan-URL:https://your-siyuan-url.com"
      }
    }
  }
}
```

---

### Claude Code (HTTP Supported)

Claude Code supports both STDIO and HTTP transports. **HTTP is recommended for remote access**.

#### Configuration File Location

```
~/.config/claude/config.json
```

#### Configuration Example (HTTP - Recommended)

```json
{
  "mcpServers": {
    "siyuan": {
      "url": "https://mcp.yourdomain.com/siyuan/mcp",
      "transport": "streamable-http",
      "headers": {
        "X-SiYuan-Token": "YOUR_SIYUAN_TOKEN_HERE",
        "X-SiYuan-URL": "http://localhost:6806"
      }
    }
  }
}
```

#### Configuration Example (STDIO - Local)

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

#### Reload Configuration

After editing the config file:
```bash
claude mcp reload
```

---

### n8n Workflows

n8n only supports HTTP transport. The official MCP Client Tool has a single-header limitation, but our server supports both formats!

#### Header Format Options

**Format 1: Separate Headers** (Recommended for community nodes)

```
X-SiYuan-Token: your-token-here
X-SiYuan-URL: http://localhost:6806
```

**Format 2: Combined Header** (For official MCP Client Tool)

```
X-SiYuan-Credentials: token=your-token-here,url=http://localhost:6806
```

#### Option A: Official MCP Client Tool (Single Header)

1. Add **MCP Client Tool** node to your workflow
2. Configure connection:
   - **Server URL**: `https://mcp.yourdomain.com/siyuan/mcp`
   - **Transport**: HTTP
   - **Authentication**: Header Auth

3. **Header Configuration**:
   - **Header Name**: `X-SiYuan-Credentials`
   - **Header Value**: `token={{$env.SIYUAN_TOKEN}},url={{$env.SIYUAN_URL}}`

4. **Set n8n Environment Variables**:
   ```
   SIYUAN_TOKEN=your-actual-token-here
   SIYUAN_URL=http://localhost:6806
   ```

#### Option B: Community Node (Multiple Headers)

1. Install community package: Settings → Community Nodes → Install `n8n-nodes-mcp`

2. Configure connection:
   - **Connection Type**: HTTP Streamable Transport
   - **URL**: `https://mcp.yourdomain.com/siyuan/mcp`
   - **Additional Headers** (one per line):
     ```
     X-SiYuan-Token:{{$env.SIYUAN_TOKEN}}
     X-SiYuan-URL:{{$env.SIYUAN_URL}}
     ```

---

### Custom Clients

#### Python Example

```python
import requests

headers = {
    "X-SiYuan-Token": "YOUR_TOKEN",
    "X-SiYuan-URL": "http://localhost:6806",
    "Content-Type": "application/json"
}

response = requests.post(
    "https://mcp.yourdomain.com/siyuan/mcp",
    headers=headers,
    json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list",
        "params": {}
    }
)

tools = response.json()
print(f"Available tools: {len(tools['result']['tools'])}")
```

#### JavaScript/Node.js Example

```javascript
const response = await fetch('https://mcp.yourdomain.com/siyuan/mcp', {
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
console.log(`Available tools: ${data.result.tools.length}`);
```

#### cURL Example

```bash
curl -X POST https://mcp.yourdomain.com/siyuan/mcp \
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

---

## Multi-Tenant Setup

The HTTP server supports multiple users connecting to their own SiYuan instances!

### Architecture

```
User 1 (Token1 + URL1) → MCP Server → User 1's SiYuan
User 2 (Token2 + URL2) → MCP Server → User 2's SiYuan
User N (TokenN + URLN) → MCP Server → User N's SiYuan
```

**Key Points:**
- ✅ No user data stored on server
- ✅ Each request brings its own credentials
- ✅ Complete isolation between users
- ✅ No server configuration needed per user

### Example: Multiple Users

**User 1 Configuration:**
```json
{
  "headers": {
    "X-SiYuan-Token": "user1-token-here",
    "X-SiYuan-URL": "http://user1-siyuan.com:6806"
  }
}
```

**User 2 Configuration:**
```json
{
  "headers": {
    "X-SiYuan-Token": "user2-token-here",
    "X-SiYuan-URL": "http://localhost:6806"
  }
}
```

---

## Security Model

### 🔐 HTTP Transport Security

**Critical**: The MCP server URL is public - tokens MUST come from client headers!

```
Client (PRIVATE)              MCP Server (PUBLIC)           SiYuan API (PRIVATE)
─────────────────            ─────────────────────          ─────────────────────
Stores: SiYuan Token   ──>   Receives: X-SiYuan-Token  ──>  Uses: Client's token
                             Stores: NOTHING
```

**Why This Matters:**
- MCP server is accessible via HTTPS (public URL)
- Anyone who discovers the URL could access your notes if token was stored on server
- Client sends token with EVERY request via header
- Server is stateless - no secrets stored

### 🔒 HTTPS Is Mandatory

**⚠️ CRITICAL: Always use HTTPS in production!**

Without TLS/HTTPS:
- ❌ Tokens sent in HTTP headers can be intercepted
- ❌ Anyone on network can read your SiYuan token
- ❌ Man-in-the-middle attacks can steal credentials

**Correct Setup:**
```json
{
  "url": "https://mcp.yourdomain.com/siyuan"  // ✅ HTTPS
}
```

**Wrong Setup:**
```json
{
  "url": "http://mcp.yourdomain.com/siyuan"   // ❌ HTTP - INSECURE!
}
```

### What to Protect

1. **Your SiYuan Token** - Treat like a password, never commit to Git
2. **Client Config Files** - Keep config files private
3. **n8n Environment Variables** - Use n8n's credential manager
4. **Environment Files** - Add `.env` to `.gitignore`

---

## Testing Your Configuration

### Test with cURL

```bash
curl -X POST https://mcp.yourdomain.com/siyuan/mcp \
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

### Success Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "siyuan_listNotebooks",
        "description": "List all notebooks in SiYuan workspace",
        ...
      },
      ... (52 tools total)
    ]
  }
}
```

### Error Responses

**Missing Token:**
```json
{
  "error": "Unauthorized",
  "message": "X-SiYuan-Token header is required"
}
```

**Missing URL:**
```json
{
  "error": "Bad Request",
  "message": "X-SiYuan-URL header is required"
}
```

**Cannot Connect to SiYuan:**
```json
{
  "error": "Service Unavailable",
  "message": "Cannot connect to SiYuan at http://localhost:6806"
}
```

---

## Troubleshooting

### "Tools Not Available" in Claude Desktop

**Symptom**: Claude says "I don't have access to siyuan_* tools"

**Solutions**:
1. Check `claude_desktop_config.json` is correctly formatted
2. Verify absolute path to `dist/server-stdio.js` is correct
3. Ensure you ran `npm run build`
4. Restart Claude Desktop completely
5. Check Claude Desktop logs: Help → View Logs

---

### "Authentication Failed" Errors

**Symptom**: "401 Unauthorized" or "Invalid token"

**Solutions**:
1. Get fresh token from SiYuan: Settings → About → Copy API Token
2. Check for extra spaces/newlines in token string
3. Ensure SiYuan is running: open `http://localhost:6806` in browser
4. Verify token hasn't been regenerated

---

### "Cannot Connect to SiYuan" Errors

**Symptom**: "Cannot connect to SiYuan at http://localhost:6806"

**Solutions**:

**If SiYuan is local:**
1. Check SiYuan is running: `curl http://localhost:6806`
2. Verify port 6806 is correct (check SiYuan settings)
3. Try `http://127.0.0.1:6806` instead of `localhost`

**If SiYuan is remote:**
1. Ensure SiYuan URL is accessible from your machine
2. Check firewall rules allow access
3. Use HTTPS if SiYuan is exposed to internet
4. Consider VPN/Tailscale for secure remote access

**If using Docker:**
1. Use Docker network name instead of localhost:
   ```
   X-SiYuan-URL: http://siyuan:6806
   ```
2. Ensure both containers are in same Docker network
3. Or use host network mode

---

### "Connection Refused" in n8n

**Symptom**: n8n cannot reach MCP server or SiYuan

**Solutions**:

**If MCP server is remote:**
1. Verify URL is accessible: `curl https://mcp.yourdomain.com/health`
2. Check firewall allows HTTPS traffic
3. Ensure SSL certificate is valid

**If SiYuan is on localhost:**
1. n8n in Docker cannot access host's localhost
2. Use Docker network name: `http://siyuan:6806`
3. Or use host network mode for n8n container
4. Or use host's IP: `http://192.168.1.X:6806`

---

### File Upload Fails

**Symptom**: "Asset upload failed" or "Invalid base64 data"

**Solutions**:
1. Verify base64 encoding is correct (no extra spaces/newlines)
2. Check file size is < 100MB
3. Ensure no path traversal in filename (`../` not allowed)
4. Test with small file first:
   ```javascript
   // 1x1 pixel PNG for testing
   siyuan_uploadAsset({
     files: [{
       filename: "test.png",
       data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
     }]
   })
   ```

---

### Slow Performance

**Symptom**: Operations take several seconds

**Possible Causes**:
1. Using many atomic tools instead of composite tools
2. Large workspace with thousands of documents
3. Network latency to remote SiYuan

**Solutions**:
1. Use composite tools (`getContentTree`, `findTasks`) instead of manual chains
2. Reduce `maxDepth` and `contentLength` parameters
3. Use `limit` parameter to cap results
4. Filter by notebook/document to reduce scope
5. Check network latency: `ping your-siyuan-server.com`

---

### Empty Results

**Symptom**: Tools return empty arrays or "no data"

**Solutions**:
1. Verify notebook is **open** in SiYuan (closed notebooks excluded by default)
2. Check notebook/document IDs are correct (20-character format: `20210817205410-2kvfpfn`)
3. Use `siyuan_listNotebooks` to find correct IDs
4. For SQL queries, check database schema matches your SiYuan version

---

## Next Steps

1. **Choose your transport mode**:
   - Local personal use → STDIO
   - Remote/multi-user → HTTP

2. **Get your credentials**:
   - SiYuan Token: Settings → About
   - SiYuan URL: Usually `http://localhost:6806`

3. **Configure your client** using examples above

4. **Test the connection** with curl or client

5. **Explore workflows**: See [USER_GUIDE.md](./USER_GUIDE.md) for usage examples

6. **Production deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup

---

**Need more help?**
- User Guide: [USER_GUIDE.md](./USER_GUIDE.md)
- Tool Reference: [TOOL_REFERENCE.md](./TOOL_REFERENCE.md)
- Open an issue: https://github.com/SerjoschDuering/siyuan-mcp-server/issues
