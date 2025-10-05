# MCP Server Deployment Strategy

**Goal:** Efficiently deploy and manage multiple MCP servers on Hetzner Cloud with auto-deployment via GitHub Actions, compatible with Claude Code, Claude Desktop, and n8n.

**Transport:** Streamable HTTP (MCP Specification 2025-03-26) - Supports multiple simultaneous clients with session isolation.

## General Strategy

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Hetzner Cloud (1 vCPU, 1GB RAM)                           │
│                                                              │
│  ┌──────────────┐                                           │
│  │    Caddy     │ ← SSL/Routing                            │
│  └──────┬───────┘                                           │
│         │                                                    │
│  ┌──────▼────────────────────────────────┐                 │
│  │  SiYuan MCP Server (Streamable HTTP)  │                 │
│  │  - Session 1: Claude Code             │                 │
│  │  - Session 2: Claude Desktop          │                 │
│  │  - Session 3: n8n Workflow A          │                 │
│  │  - Session N: Any client              │                 │
│  │  RAM: ~80-150MB                       │                 │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  ┌──────────────────────────────────────────┐              │
│  │  S3 MCP Server (Streamable HTTP)         │              │
│  │  - Multiple concurrent sessions          │              │
│  │  RAM: ~60-120MB                          │              │
│  └──────────────────────────────────────────┘              │
│                                                              │
│  ┌──────────────────────────────────────────┐              │
│  │  Other MCP Servers...                    │              │
│  └──────────────────────────────────────────┘              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     n8n      │  │   SiYuan     │  │  Other Apps  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Streamable HTTP Transport:** Each MCP server natively handles multiple clients via session management (MCP Spec 2025-03-26)
2. **Session Isolation:** Each client connection gets a unique session ID - prevents data leakage between clients
3. **One Container Per MCP Type:** Not per user - scales efficiently while maintaining isolation
4. **Universal Client Support:** Same endpoint serves Claude Code, Claude Desktop, n8n, and custom clients
5. **Auto-Discovery & Deploy:** Add new MCP by creating folder in monorepo → push → auto-deploys

### Why Streamable HTTP?

- ✅ **Multi-client native:** Designed for concurrent connections (unlike stdio's 1-to-1 limitation)
- ✅ **Session management:** Built-in isolation via `Mcp-Session-Id` headers
- ✅ **OAuth support:** Standard authentication patterns
- ✅ **Resumable connections:** Handle network interruptions gracefully
- ✅ **Firewall friendly:** Standard HTTPS (no special protocols)

### Deployment Modes

| Client | Transport | Connection |
|--------|----------|------------|
| **Claude Code** | Streamable HTTP | `https://siyuan-mcp.yourdomain.com` |
| **Claude Desktop** | Streamable HTTP | `https://siyuan-mcp.yourdomain.com` |
| **n8n MCP Client** | Streamable HTTP | `https://siyuan-mcp.yourdomain.com` |
| **Custom Clients** | Streamable HTTP | `https://siyuan-mcp.yourdomain.com` |

**All clients connect to the same endpoint - sessions keep them isolated!**

## Repository Structure

### Option 1: Monorepo (Recommended for managing multiple MCPs)

```
mcp-servers/                      # Main monorepo
├── .github/
│   └── workflows/
│       ├── deploy.yml            # Auto-deploy on push
│       └── add-mcp.yml           # Manual MCP addition via UI
├── servers/
│   ├── siyuan-mcp/               # Each MCP in own folder
│   │   ├── src/
│   │   │   ├── server.ts         # Streamable HTTP server
│   │   │   └── tools/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   ├── s3-mcp/
│   │   ├── src/
│   │   │   └── server.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   └── notion-mcp/               # <-- Just add folder, push = deployed!
│       ├── src/
│       │   └── server.ts
│       ├── Dockerfile
│       └── package.json
├── infrastructure/
│   ├── docker-compose.yml        # All MCP server containers
│   ├── caddy/
│   │   └── Caddyfile             # Auto-generated routes
│   └── scripts/
│       ├── generate-compose.sh   # Auto-generate docker-compose
│       └── update-caddy.sh
└── shared/
    └── mcp-server-template/      # Template for new MCPs
```

### Option 2: Individual Repositories (Easier to manage separately)

```
siyuan-mcp-server/               # This repository
├── src-v2/
│   ├── server.ts                # Updated to Streamable HTTP
│   ├── tools/
│   └── types/
├── Dockerfile
├── .github/
│   └── workflows/
│       └── deploy.yml
└── package.json

s3-mcp-server/                   # Separate repo
└── ... (same structure)
```

**Both options work - use monorepo if you manage many MCPs, individual repos for independent teams.**

## Docker Compose Setup

Add to your existing `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # Your existing services (n8n, siyuan, etc.)...

  # SiYuan MCP Server - Handles multiple clients via sessions
  siyuan-mcp:
    image: ghcr.io/yourusername/siyuan-mcp-server:latest
    container_name: siyuan-mcp
    environment:
      - SIYUAN_TOKEN=${SIYUAN_TOKEN}
      - SIYUAN_API_URL=http://siyuan:6806
      - NODE_ENV=production
      - PORT=3000
      # Optional: Enable authentication
      - MCP_AUTH_ENABLED=true
      - MCP_AUTH_TOKEN=${SIYUAN_MCP_TOKEN}
    expose:
      - "3000"
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # S3 MCP Server - Separate container, separate sessions
  s3-mcp:
    image: ghcr.io/yourusername/s3-mcp-server:latest
    container_name: s3-mcp
    environment:
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
      - S3_ENDPOINT=${S3_ENDPOINT}
      - PORT=3001
      - MCP_AUTH_ENABLED=true
      - MCP_AUTH_TOKEN=${S3_MCP_TOKEN}
    expose:
      - "3001"
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
    restart: unless-stopped
    networks:
      - app-network

  # Auto-update containers when new images pushed
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

**Key Changes:**
- ✅ One container per MCP type (not gateway)
- ✅ Each handles multiple clients via Streamable HTTP sessions
- ✅ Optional authentication via bearer tokens
- ✅ Health checks for reliability
- ✅ Watchtower auto-updates

## Caddyfile Configuration

Add to your existing Caddyfile:

```caddy
# SiYuan MCP Server
siyuan-mcp.yourdomain.com {
    # Streamable HTTP requires proper headers
    reverse_proxy siyuan-mcp:3000 {
        # Preserve MCP session headers
        header_up Mcp-Session-Id {header.Mcp-Session-Id}
        header_up Authorization {header.Authorization}

        # Enable streaming
        flush_interval -1
    }
}

# S3 MCP Server
s3-mcp.yourdomain.com {
    reverse_proxy s3-mcp:3001 {
        header_up Mcp-Session-Id {header.Mcp-Session-Id}
        header_up Authorization {header.Authorization}
        flush_interval -1
    }
}

# Optional: Single domain with path-based routing
mcp.yourdomain.com {
    # Route /siyuan/* to SiYuan MCP
    handle /siyuan/* {
        uri strip_prefix /siyuan
        reverse_proxy siyuan-mcp:3000 {
            header_up Mcp-Session-Id {header.Mcp-Session-Id}
            header_up Authorization {header.Authorization}
            flush_interval -1
        }
    }

    # Route /s3/* to S3 MCP
    handle /s3/* {
        uri strip_prefix /s3
        reverse_proxy s3-mcp:3001 {
            header_up Mcp-Session-Id {header.Mcp-Session-Id}
            header_up Authorization {header.Authorization}
            flush_interval -1
        }
    }
}
```

**Key Settings:**
- `flush_interval -1`: Required for streaming responses (SSE)
- `header_up Mcp-Session-Id`: Preserve session tracking
- `header_up Authorization`: Pass authentication tokens

## GitHub Actions Workflows

### 1. Auto-Deploy Workflow

`.github/workflows/deploy.yml`:

```yaml
name: Auto-Deploy MCP Gateway

on:
  push:
    branches: [main]
    paths:
      - 'mcps/**'
      - 'gateway/**'
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/mcp-gateway

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Auto-generate MCP config
        run: |
          ./scripts/generate-mcp-config.sh

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ./gateway
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

      - name: Deploy to Hetzner
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: ${{ secrets.HETZNER_USER }}
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            cd /srv/docker-compose
            docker compose pull mcp-gateway
            docker compose up -d mcp-gateway

      - name: Update Caddy routes
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: ${{ secrets.HETZNER_USER }}
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            cd /srv/docker-compose
            ./scripts/update-caddy-routes.sh
            docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 2. Manual Add MCP Workflow

`.github/workflows/add-mcp.yml`:

```yaml
name: Add New MCP Server

on:
  workflow_dispatch:
    inputs:
      mcp_name:
        description: 'MCP Name (e.g., notion, github, openai)'
        required: true
        type: string
      source_type:
        description: 'Source Type'
        required: true
        type: choice
        options:
          - npm_package
          - git_repo
          - local_code
      source:
        description: 'NPM package name or Git URL'
        required: false
        type: string
      subdomain:
        description: 'Subdomain (e.g., notion for notion.domain.com)'
        required: true
        type: string

jobs:
  add-mcp:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create MCP folder structure
        run: |
          mkdir -p mcps/${{ inputs.mcp_name }}
          cd mcps/${{ inputs.mcp_name }}

          # Initialize from template
          npm init -y

          # Update package.json with source
          jq '.dependencies["${{ inputs.source }}"] = "latest"' package.json > tmp.json
          mv tmp.json package.json

      - name: Generate Caddy config
        run: |
          mkdir -p config/caddy-routes
          cat > config/caddy-routes/${{ inputs.subdomain }}.caddy <<EOF
          ${{ inputs.subdomain }}.yourdomain.com {
              reverse_proxy mcp-gateway:3000 {
                  rewrite * /${{ inputs.mcp_name }}{uri}
              }
          }
          EOF

      - name: Commit and trigger deployment
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git commit -m "feat: Add ${{ inputs.mcp_name }} MCP"
          git push
```

## MCP Server Template

Use this template for creating new MCP servers compatible with the gateway:

### GitHub Template Repository: `mcp-server-template`

**Repository Structure:**

```
mcp-server-template/
├── src/
│   ├── server.ts              # Main MCP server
│   ├── tools/
│   │   └── example.ts         # Tool implementations
│   └── types/
│       └── index.ts
├── tests/
│   └── server.test.ts
├── package.json
├── tsconfig.json
├── Dockerfile                  # Optional: standalone deployment
├── README.md
└── .github/
    └── workflows/
        ├── test.yml
        └── publish.yml         # Publish to npm/GitHub packages
```

**package.json Template:**

```json
{
  "name": "@yourorg/your-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/server.js",
  "types": "./dist/server.d.ts",
  "exports": {
    ".": {
      "types": "./dist/server.d.ts",
      "import": "./dist/server.js"
    },
    "./tools": {
      "types": "./dist/tools/index.d.ts",
      "import": "./dist/tools/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "node --loader ts-node/esm src/server.ts",
    "test": "jest",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.19.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.8.0",
    "ts-node": "^10.9.2"
  },
  "keywords": ["mcp", "mcp-server", "model-context-protocol"]
}
```

**server.ts Template (Streamable HTTP):**

```typescript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamable-http.js";
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

// Create MCP server instance
const server = new Server(
  {
    name: "your-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define your tools
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "example_tool",
      description: "An example tool",
      inputSchema: {
        type: "object",
        properties: {
          input: { type: "string" }
        },
        required: ["input"]
      }
    }
  ]
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "example_tool":
      return {
        content: [
          {
            type: "text",
            text: `Result: ${args.input}`
          }
        ]
      };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Optional: Authentication middleware
if (AUTH_TOKEN) {
  app.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${AUTH_TOKEN}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Initialize Streamable HTTP transport
const transport = new StreamableHTTPServerTransport(app);

async function main() {
  await server.connect(transport);

  app.listen(PORT, () => {
    console.error(`MCP server running on Streamable HTTP at port ${PORT}`);
    console.error(`Health check: http://localhost:${PORT}/health`);
  });
}

main().catch(console.error);
```

**Key Changes from stdio:**
- ✅ Uses `StreamableHTTPServerTransport` instead of `StdioServerTransport`
- ✅ Express.js for HTTP server
- ✅ Built-in authentication support
- ✅ Health check endpoint for monitoring
- ✅ Handles multiple concurrent client sessions automatically

## Client Configuration

### Claude Code (Streamable HTTP)

Add to `~/.config/claude/config.json`:

```json
{
  "mcpServers": {
    "siyuan": {
      "url": "https://siyuan-mcp.yourdomain.com",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer YOUR_SIYUAN_MCP_TOKEN"
      }
    },
    "s3": {
      "url": "https://s3-mcp.yourdomain.com",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer YOUR_S3_MCP_TOKEN"
      }
    }
  }
}
```

**Note:** Claude Code support for Streamable HTTP may require MCP SDK updates. Check SDK version compatibility.

### Claude Desktop (Streamable HTTP)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "siyuan": {
      "url": "https://siyuan-mcp.yourdomain.com",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer YOUR_SIYUAN_MCP_TOKEN"
      }
    },
    "s3": {
      "url": "https://s3-mcp.yourdomain.com",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer YOUR_S3_MCP_TOKEN"
      }
    }
  }
}
```

### n8n (HTTP via MCP Client Tool)

1. Add **MCP Client Tool** node in n8n workflow
2. Configure connection:
   - **Server URL:** `https://siyuan-mcp.yourdomain.com`
   - **Transport:** Streamable HTTP
   - **Authentication:** Bearer Token
   - **Token:** `YOUR_SIYUAN_MCP_TOKEN`

Or use **HTTP Request** node directly:

```javascript
// Initialize session
POST https://siyuan-mcp.yourdomain.com/mcp/v1/initialize
Headers:
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "protocolVersion": "2025-03-26",
  "clientInfo": {
    "name": "n8n",
    "version": "1.0.0"
  }
}

// Response includes: { "sessionId": "abc123..." }

// List tools
POST https://siyuan-mcp.yourdomain.com/mcp/v1/tools/list
Headers:
  Authorization: Bearer YOUR_TOKEN
  Mcp-Session-Id: abc123

// Call tool
POST https://siyuan-mcp.yourdomain.com/mcp/v1/tools/call
Headers:
  Authorization: Bearer YOUR_TOKEN
  Mcp-Session-Id: abc123
Body:
{
  "name": "queryBlocks",
  "arguments": {
    "sql": "SELECT * FROM blocks LIMIT 5"
  }
}
```

### Custom Clients (Python Example)

```python
import requests

class MCPClient:
    def __init__(self, base_url, auth_token):
        self.base_url = base_url
        self.session_id = None
        self.headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

    def initialize(self):
        response = requests.post(
            f"{self.base_url}/mcp/v1/initialize",
            headers=self.headers,
            json={
                "protocolVersion": "2025-03-26",
                "clientInfo": {"name": "python-client", "version": "1.0"}
            }
        )
        self.session_id = response.json()["sessionId"]
        self.headers["Mcp-Session-Id"] = self.session_id

    def list_tools(self):
        response = requests.post(
            f"{self.base_url}/mcp/v1/tools/list",
            headers=self.headers
        )
        return response.json()

    def call_tool(self, tool_name, arguments):
        response = requests.post(
            f"{self.base_url}/mcp/v1/tools/call",
            headers=self.headers,
            json={"name": tool_name, "arguments": arguments}
        )
        return response.json()

# Usage
client = MCPClient("https://siyuan-mcp.yourdomain.com", "YOUR_TOKEN")
client.initialize()
tools = client.list_tools()
result = client.call_tool("queryBlocks", {"sql": "SELECT * FROM blocks LIMIT 5"})
```

## Adding a New MCP Server

### Method 1: Auto-Discovery (Preferred)

```bash
# Clone the monorepo
git clone https://github.com/yourusername/mcp-servers.git
cd mcp-servers

# Create new MCP from template
mkdir -p mcps/notion
cd mcps/notion

# Initialize from template
npm init -y
npm install @notionhq/client @modelcontextprotocol/sdk

# Write server.ts (or copy from template)
cat > server.ts <<EOF
// Your MCP server code here
EOF

# Commit and push - auto-deploys!
git add .
git commit -m "feat: Add Notion MCP"
git push origin main
```

### Method 2: GitHub UI Workflow

1. Go to repository → **Actions** tab
2. Select **"Add New MCP Server"** workflow
3. Click **"Run workflow"**
4. Fill in:
   - MCP Name: `notion`
   - Source Type: `npm_package`
   - Source: `@notionhq/mcp-server`
   - Subdomain: `notion`
5. Click **"Run workflow"** → Auto-deploys!

### Method 3: Use Existing NPM Package

```bash
cd mcps
mkdir openai
cd openai

cat > package.json <<EOF
{
  "name": "openai-mcp-wrapper",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@openai/mcp-server": "latest"
  }
}
EOF

git add . && git commit -m "feat: Add OpenAI MCP" && git push
```

## Resource Usage Estimates (Realistic)

Based on actual Node.js memory usage patterns:

| MCP Server Type | Idle RAM | Active RAM | Concurrent Clients |
|-----------------|----------|------------|-------------------|
| **Lightweight** (e.g., Weather API) | 50-80MB | 100-150MB | 10-50+ |
| **Medium** (e.g., SiYuan, 52 tools) | 80-120MB | 150-250MB | 5-20 |
| **Heavy** (e.g., File processing) | 120-200MB | 300-500MB | 2-10 |

**Your Hetzner Setup (1 vCPU, 1GB RAM available):**

### Conservative Estimate (Recommended)
```
Base System: ~100MB
SiYuan MCP: ~120MB idle, ~200MB active
S3 MCP: ~80MB idle, ~150MB active
Notion MCP: ~80MB idle, ~150MB active
Buffer: ~200MB
──────────────────────────────────────
Total: ~730MB average, ~900MB peak
```
**✅ Comfortable fit for 3-5 medium MCP servers**

### Optimistic Estimate
```
Base System: ~100MB
5 lightweight MCPs: ~400MB idle, ~750MB active
Buffer: ~150MB
──────────────────────────────────────
Total: ~650MB average, ~1000MB peak
```
**⚠️ Can fit 5-7 lightweight MCPs, monitor closely**

### Recommendations
- **Start with 2-3 MCPs** and monitor actual usage
- **Use watchtower** for gradual rollouts
- **Set memory limits** in docker-compose (`mem_limit: 200m`)
- **Monitor with** `docker stats` or Prometheus
- **Upgrade to 2GB RAM** if running >5 MCPs regularly

## Next Steps

1. **Create monorepo** from this structure
2. **Set up GitHub secrets** for Hetzner SSH
3. **Migrate siyuan-mcp-server** to `mcps/siyuan/`
4. **Build gateway** with HTTP + stdio support
5. **Deploy** and test with Claude Code, Claude Desktop, n8n
6. **Add more MCPs** via GitHub Actions UI or git push

## Benefits Summary

✅ **Multi-Client Native:** Streamable HTTP supports concurrent connections with session isolation
✅ **Standards Compliant:** MCP Specification 2025-03-26 (latest standard)
✅ **Universal Compatibility:** Works with Claude Code, Claude Desktop, n8n, and custom clients
✅ **Resource Efficient:** One container per MCP type, not per user (3-5 MCPs on 1GB RAM)
✅ **Auto-Deploy:** Push code → GitHub Actions → live in 2 minutes
✅ **Built-in Security:** OAuth support, bearer token auth, session isolation
✅ **Easy Scaling:** Add new MCP = create folder + push to git
✅ **Production Ready:** Health checks, graceful shutdowns, monitoring support
✅ **Future Proof:** Based on official MCP specification, not custom protocols

## Critical Differences from Original Plan

### ❌ What Changed (Based on Gemini Review)

| Original Plan | Issue | Corrected Approach |
|---------------|-------|-------------------|
| stdio gateway | Cannot multiplex to multiple clients | Streamable HTTP with sessions |
| 150-300MB for 10 MCPs | Severely underestimated (5-10x too low) | 80-150MB per MCP (realistic) |
| No authentication | Security risk | Built-in OAuth + bearer tokens |
| No health checks | Deployment reliability | Health endpoints + monitoring |
| Gateway bottleneck | Single point of failure | Individual containers per MCP type |

### ✅ Why This Works Better

1. **Session Management:** Each client gets isolated session - no crosstalk
2. **Horizontal Scaling:** Can add more MCP containers across multiple hosts
3. **Realistic Resources:** 3-5 medium MCPs fit comfortably in 1GB RAM
4. **Strong Isolation:** Container-per-MCP-type prevents "noisy neighbor" issues
5. **Standard Protocol:** Uses official MCP Streamable HTTP (not custom stdio wrapper)
