# MCPB Implementation Strategy for SiYuan MCP Server

**Objective**: Enable one-click installation of SiYuan MCP Server in Claude Desktop via MCPB (MCP Bundle) format

**Last Updated**: 2025-01-09

---

## 📋 Executive Summary

**What is MCPB?**
- MCPB (MCP Bundle) is Anthropic's new one-click installation format for MCP servers
- Replaces manual JSON configuration with user-friendly extensions
- Similar to Chrome extensions (.crx) or VS Code extensions (.vsix)
- Format: `.mcpb` files are zip archives containing server code + manifest.json

**Why This Matters:**
- ✅ Eliminates installation friction (no more manual JSON editing)
- ✅ Automatic dependency bundling (no npm install required)
- ✅ Built-in configuration UI in Claude Desktop
- ✅ Automatic updates support
- ✅ Digital signature verification for security

**Current Status:**
- Specification version: 0.1 (actively evolving)
- Official repo: https://github.com/anthropics/mcpb
- Supported in Claude Desktop (Settings → Extensions)

---

## 🎯 Implementation Goals

### Phase 1: Basic MCPB Support (Week 1)
- Create manifest.json for STDIO transport
- Bundle dependencies using mcpb CLI
- Test local installation in Claude Desktop

### Phase 2: User Configuration (Week 2)
- Add user-configurable options (SiYuan URL, token)
- Create configuration UI schema
- Test with different SiYuan configurations

### Phase 3: Distribution (Week 3)
- Publish to Anthropic extension directory
- Add to Smithery registry
- Create automated build pipeline

### Phase 4: Advanced Features (Week 4)
- Add automatic update mechanism
- Implement digital signatures
- Multi-platform testing (macOS, Windows)

---

## 🏗️ Technical Architecture

### Current vs MCPB Architecture

**Current STDIO Transport:**
```
User → Manually edit claude_desktop_config.json
     → Manually run npm install && npm run build
     → Copy absolute path to server-stdio.js
     → Restart Claude Desktop
```

**With MCPB:**
```
User → Download .mcpb file
     → Claude Desktop Settings → Extensions → Install
     → Configure in UI (SiYuan URL, token)
     → Done!
```

### MCPB Bundle Structure

```
siyuan-mcp-server.mcpb (zip file)
├── manifest.json              # Extension metadata & config
├── dist/
│   └── server-stdio.js        # Bundled server (already compiled)
├── node_modules/              # All dependencies included
├── package.json
├── README.md
└── icon.png                   # 128x128 extension icon
```

---

## 📝 Manifest.json Specification

### Complete Manifest for SiYuan MCP Server

```json
{
  "manifest_version": 1,
  "name": "siyuan-mcp-server",
  "version": "2.0.0",
  "display_name": "SiYuan Note",
  "description": "Connect Claude to your SiYuan Note workspace with 52 specialized tools",
  "long_description": "Enable AI-powered note management with SiYuan Note. Features 46 atomic tools for fine-grained control and 6 composite tools for optimized workflows. Supports notebook management, document operations, block control, file management, SQL queries, and more.",

  "author": {
    "name": "Serjosch Duering",
    "email": "your-email@example.com",
    "url": "https://github.com/SerjoschDuering"
  },

  "icon": "icon.png",
  "homepage": "https://github.com/SerjoschDuering/siyuan-mcp-server",
  "documentation": "https://github.com/SerjoschDuering/siyuan-mcp-server/blob/main/docs/USER_GUIDE.md",
  "repository": {
    "type": "git",
    "url": "https://github.com/SerjoschDuering/siyuan-mcp-server.git"
  },

  "server": {
    "type": "node",
    "command": "node",
    "args": ["dist/server-stdio.js"],
    "env": {
      "SIYUAN_API_URL": "${user_config.siyuan_url}",
      "SIYUAN_TOKEN": "${user_config.siyuan_token}"
    }
  },

  "user_config": {
    "siyuan_url": {
      "type": "string",
      "title": "SiYuan API URL",
      "description": "The URL where your SiYuan Note instance is running",
      "default": "http://localhost:6806",
      "required": true,
      "placeholder": "http://localhost:6806"
    },
    "siyuan_token": {
      "type": "string",
      "title": "SiYuan API Token",
      "description": "Your SiYuan API token (found in Settings → About)",
      "required": true,
      "secret": true,
      "placeholder": "Enter your SiYuan API token"
    }
  },

  "compatibility": {
    "min_claude_version": "0.8.0",
    "platforms": ["darwin", "win32"]
  },

  "tools": [
    {
      "name": "siyuan_listNotebooks",
      "description": "List all notebooks in SiYuan workspace"
    },
    {
      "name": "siyuan_getContentTree",
      "description": "Get complete workspace hierarchy with content previews"
    },
    {
      "name": "siyuan_findTasks",
      "description": "Find and manage TODO items across workspace"
    }
    // ... (truncated for brevity - can list all 52 tools)
  ],

  "prompts": [
    {
      "name": "daily-note",
      "description": "Create or access today's daily note"
    },
    {
      "name": "task-review",
      "description": "Review all open tasks across notebooks"
    },
    {
      "name": "workspace-overview",
      "description": "Get a complete overview of your workspace"
    }
  ]
}
```

### Key Manifest Features

**Variable Substitution:**
```json
"env": {
  "SIYUAN_API_URL": "${user_config.siyuan_url}"
}
```

**User Configuration Types:**
- `string` - Text input
- `number` - Numeric input
- `boolean` - Checkbox
- `secret` - Password field (hidden input)

**Platform-Specific Configuration:**
```json
"server": {
  "darwin": {
    "command": "node",
    "args": ["dist/server-stdio.js"]
  },
  "win32": {
    "command": "node.exe",
    "args": ["dist\\server-stdio.js"]
  }
}
```

---

## 🛠️ Implementation Steps

### Step 1: Install MCPB CLI

```bash
npm install -g @anthropic-ai/mcpb
```

### Step 2: Initialize Manifest

```bash
cd /path/to/siyuan-mcp-server
mcpb init
```

This creates a template `manifest.json` in the root directory.

### Step 3: Create Icon

Create `icon.png` (128x128 pixels) for the extension:

```bash
# Use your favorite tool to create a SiYuan-themed icon
# Recommended: Simple, recognizable design
# Format: PNG, 128x128px
```

### Step 4: Bundle Dependencies

**Option A: Include node_modules (Simpler)**
```bash
# Build the server
npm run build

# Pack with dependencies
mcpb pack .
```

**Option B: Use pkg for Standalone Binary (Advanced)**
```bash
# Install pkg
npm install -g pkg

# Create standalone binary
pkg dist/server-stdio.js --targets node18-macos-x64,node18-win-x64 --output server

# Update manifest to use binary
{
  "server": {
    "type": "binary",
    "command": "./server"
  }
}
```

### Step 5: Validate Manifest

```bash
mcpb validate manifest.json
```

Fix any validation errors reported by the CLI.

### Step 6: Pack Extension

```bash
mcpb pack . --output siyuan-mcp-server.mcpb
```

### Step 7: Test Locally

1. Open Claude Desktop
2. Go to Settings → Extensions
3. Click "Advanced settings" → "Extension Developer"
4. Click "Select .mcpb file"
5. Choose `siyuan-mcp-server.mcpb`
6. Configure SiYuan URL and token in the UI
7. Test: Ask Claude "List my SiYuan notebooks"

### Step 8: Sign Extension (Optional)

```bash
# Self-signed for testing
mcpb sign siyuan-mcp-server.mcpb --self-signed

# Or use your certificate
mcpb sign siyuan-mcp-server.mcpb --cert ./mycert.pem --key ./mykey.pem
```

---

## 🚀 Automated Build Pipeline

### GitHub Actions Workflow

Create `.github/workflows/build-mcpb.yml`:

```yaml
name: Build MCPB Extension

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build-mcpb:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build server
        run: npm run build

      - name: Install MCPB CLI
        run: npm install -g @anthropic-ai/mcpb

      - name: Validate manifest
        run: mcpb validate manifest.json

      - name: Pack extension
        run: mcpb pack . --output siyuan-mcp-server-${{ github.ref_name }}.mcpb

      - name: Sign extension
        run: mcpb sign siyuan-mcp-server-${{ github.ref_name }}.mcpb --self-signed

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: siyuan-mcp-server-mcpb
          path: siyuan-mcp-server-*.mcpb

      - name: Create Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: siyuan-mcp-server-*.mcpb
          draft: false
          prerelease: false
```

### NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "build:mcpb": "npm run build && mcpb pack . --output siyuan-mcp-server.mcpb",
    "validate:mcpb": "mcpb validate manifest.json",
    "sign:mcpb": "mcpb sign siyuan-mcp-server.mcpb --self-signed",
    "dev:mcpb": "npm run build:mcpb && mcpb info siyuan-mcp-server.mcpb"
  }
}
```

---

## 📦 Distribution Channels

### 1. Anthropic Extension Directory

**Submission Process:**
1. Create `manifest.json` with complete metadata
2. Pack and sign the extension
3. Submit to Anthropic via GitHub or official portal
4. Wait for review and approval

**Requirements:**
- Digital signature (can be self-signed initially)
- Complete manifest with icon
- Working demo/screenshots
- Clear description and documentation

### 2. Smithery Registry

**Add to Smithery:**
1. Visit https://smithery.ai
2. Create account or sign in
3. Submit package with metadata
4. Link to GitHub releases

**Smithery YAML (optional):**

Create `smithery.yaml`:
```yaml
name: siyuan-mcp-server
version: 2.0.0
description: Connect Claude to your SiYuan Note workspace
author: Serjosch Duering
repository: https://github.com/SerjoschDuering/siyuan-mcp-server

# Installation methods
install:
  mcpb:
    url: https://github.com/SerjoschDuering/siyuan-mcp-server/releases/latest/download/siyuan-mcp-server.mcpb
  npm:
    package: "@serjoschduering/siyuan-mcp-server"
```

### 3. Direct Download (GitHub Releases)

Users can download `.mcpb` files directly from:
```
https://github.com/SerjoschDuering/siyuan-mcp-server/releases
```

Then install via Claude Desktop → Extensions → "Select .mcpb file"

---

## 🔄 Maintaining Both Installation Methods

### Support Matrix

| Installation Method | Use Case | Maintenance |
|---------------------|----------|-------------|
| **MCPB (.mcpb file)** | Non-technical users, Claude Desktop | Auto-updates, UI config |
| **Manual STDIO (npm)** | Developers, custom setups | Manual updates, JSON config |
| **HTTP Server (Docker)** | Production, multi-client | Server deployment |

### Documentation Updates

**README.md:**
```markdown
## Installation

### Method 1: One-Click Install (Recommended for Claude Desktop)

1. Download [siyuan-mcp-server.mcpb](releases/latest/download/siyuan-mcp-server.mcpb)
2. Open Claude Desktop → Settings → Extensions
3. Click "Advanced settings" → "Select .mcpb file"
4. Choose the downloaded .mcpb file
5. Configure your SiYuan URL and token
6. Done!

### Method 2: Manual Install (STDIO)
[Existing manual installation instructions...]

### Method 3: HTTP Server (Production)
[Existing HTTP server instructions...]
```

---

## 🧪 Testing Checklist

### Local Testing

- [ ] Extension installs without errors
- [ ] Configuration UI shows SiYuan URL and token fields
- [ ] All 52 tools are available in Claude
- [ ] Basic workflow: List notebooks, create note, find tasks
- [ ] Error handling: Invalid URL, wrong token
- [ ] Restart Claude Desktop - extension persists

### Cross-Platform Testing

- [ ] macOS installation
- [ ] Windows installation
- [ ] Icon displays correctly
- [ ] Paths work on both platforms

### Distribution Testing

- [ ] GitHub release download works
- [ ] Smithery installation works
- [ ] Extension directory listing (when available)
- [ ] Auto-update mechanism (when implemented)

---

## 🚨 Challenges & Solutions

### Challenge 1: Token Security

**Problem**: User tokens stored in Claude Desktop config

**Solution**:
- Use `"secret": true` in manifest for password field
- Tokens encrypted by Claude Desktop
- Never log or expose tokens in code

### Challenge 2: Bundle Size

**Problem**: Including node_modules makes .mcpb large

**Solutions**:
1. **Production dependencies only:**
   ```bash
   npm ci --production
   mcpb pack .
   ```

2. **Use pkg for binary:**
   ```bash
   pkg dist/server-stdio.js
   # Creates standalone ~50MB binary
   ```

3. **Leverage Claude's bundled Node.js:**
   - Don't bundle common packages
   - Claude Desktop includes Node.js runtime

### Challenge 3: SiYuan URL Variability

**Problem**: Users have different SiYuan setups (local, remote, Docker)

**Solution**:
```json
"user_config": {
  "siyuan_url": {
    "type": "string",
    "title": "SiYuan API URL",
    "description": "Examples: http://localhost:6806 (local), http://192.168.1.100:6806 (network), http://siyuan:6806 (Docker)",
    "default": "http://localhost:6806",
    "pattern": "^https?://.+:\\d+$",
    "error_message": "Must be a valid HTTP/HTTPS URL with port (e.g., http://localhost:6806)"
  }
}
```

### Challenge 4: Backward Compatibility

**Problem**: Existing users have manual config

**Solution**:
- Support both installation methods
- Document migration path
- Provide conversion script

---

## 📈 Rollout Strategy

### Week 1: Internal Testing
- Create manifest.json
- Build and test .mcpb locally
- Iterate on configuration UI

### Week 2: Beta Release
- Publish v2.1.0-beta with MCPB support
- Share with community for testing
- Gather feedback on configuration UX

### Week 3: Public Release
- Release v2.1.0 stable
- Submit to Anthropic extension directory
- Update all documentation

### Week 4: Optimization
- Monitor user feedback
- Optimize bundle size
- Add auto-update mechanism

---

## 📚 Resources

**Official Documentation:**
- MCPB Specification: https://github.com/anthropics/mcpb
- Manifest Spec: https://github.com/anthropics/mcpb/blob/main/MANIFEST.md
- CLI Documentation: https://github.com/anthropics/mcpb/blob/main/CLI.md

**Examples:**
- File Manager (Python): https://github.com/anthropics/mcpb/tree/main/examples/file-manager-python
- Calculator (Node.js): https://github.com/anthropics/mcpb/tree/main/examples/calculator-nodejs

**Community:**
- Awesome MCP Servers: https://github.com/MCPStar/awesome-dxt-mcp
- Smithery Registry: https://smithery.ai

---

## ✅ Next Actions

1. **Immediate (This Week):**
   - [ ] Install @anthropic-ai/mcpb CLI
   - [ ] Create manifest.json in root
   - [ ] Design and create icon.png (128x128)
   - [ ] Test local packaging: `mcpb pack .`

2. **Short-term (Next Week):**
   - [ ] Add manifest validation to CI
   - [ ] Create GitHub Actions workflow
   - [ ] Test on macOS and Windows
   - [ ] Write MCPB installation docs

3. **Medium-term (Month 1):**
   - [ ] Submit to Anthropic extension directory
   - [ ] Publish to Smithery
   - [ ] Create video tutorial
   - [ ] Monitor user adoption

4. **Long-term (Quarter 1):**
   - [ ] Implement auto-updates
   - [ ] Add digital signatures
   - [ ] Optimize bundle size
   - [ ] Create MCPB-specific features

---

**Questions? Issues?**
- Open an issue: https://github.com/SerjoschDuering/siyuan-mcp-server/issues
- MCPB Discussions: https://github.com/anthropics/mcpb/discussions
