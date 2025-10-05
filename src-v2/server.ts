#!/usr/bin/env node

/**
 * SiYuan MCP Server v2.0
 * Streamable HTTP transport - supports multiple concurrent client sessions
 */

import express, { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Tool registration modules
import { registerNotebookTools } from './tools/notebook.js';
import { registerDocumentTools } from './tools/document.js';
import { registerBlockTools } from './tools/block.js';
import { registerSearchTools } from './tools/search.js';
import { registerAssetTools } from './tools/asset.js';
import { registerExportTools } from './tools/export.js';
import { registerFileTools } from './tools/file.js';
import { registerAttributeTools } from './tools/attribute.js';
import { registerTemplateTools } from './tools/template.js';
import { registerSystemTools } from './tools/system.js';
import { registerCompositeTools } from './tools/composite.js';

// Configuration from environment
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';
const BEARER_TOKEN = process.env.MCP_BEARER_TOKEN;

// Express app setup
const app = express();
app.use(express.json());

// Session storage for active transports
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

/**
 * Create and configure the MCP server
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'siyuan-mcp-server',
    version: '2.0.0',
    capabilities: {
      tools: {},
    },
  });

  // Register all SiYuan tools
  registerNotebookTools(server);
  registerDocumentTools(server);
  registerBlockTools(server);
  registerSearchTools(server);
  registerAssetTools(server);
  registerExportTools(server);
  registerFileTools(server);
  registerAttributeTools(server);
  registerTemplateTools(server);
  registerSystemTools(server);
  registerCompositeTools(server);

  return server;
}

// Create server instance (shared across all sessions)
const mcpServer = createMcpServer();

/**
 * Helper to check if request is an initialization request
 */
function isInitializeRequest(body: any): boolean {
  return body?.method === 'initialize';
}

/**
 * Optional: Bearer token authentication middleware
 */
function authenticateRequest(req: Request, res: Response, next: NextFunction): void {
  if (!BEARER_TOKEN) {
    // No authentication configured
    next();
    return;
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${BEARER_TOKEN}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

/**
 * Main MCP endpoint handler
 */
async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport for this session
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New session initialization
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          console.error(`[MCP] Session initialized: ${newSessionId}`);
          transports[newSessionId] = transport;
        },
        onsessionclosed: (closedSessionId) => {
          console.error(`[MCP] Session closed: ${closedSessionId}`);
          delete transports[closedSessionId];
        },
      });

      // Set up transport cleanup on close
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.error(`[MCP] Transport closed for session ${sid}`);
          delete transports[sid];
        }
      };

      // Connect server to transport
      await mcpServer.connect(transport);
    } else {
      // Invalid request (no session ID and not initialization)
      res.status(400).json({
        error: 'Bad Request: Missing session ID or not an initialize request'
      });
      return;
    }

    // Handle the request through the transport
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('[MCP] Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    server: 'siyuan-mcp-server',
    version: '2.0.0',
    transport: 'streamable-http',
    activeSessions: Object.keys(transports).length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * MCP endpoints (with optional authentication)
 */
app.post('/mcp', authenticateRequest, handleMcpRequest);
app.get('/mcp', authenticateRequest, handleMcpRequest);
app.delete('/mcp', authenticateRequest, handleMcpRequest);

/**
 * Main server initialization
 */
async function main() {
  try {
    app.listen(PORT, HOST, () => {
      console.error(`[MCP] SiYuan MCP Server v2.0 (Streamable HTTP)`);
      console.error(`[MCP] Listening on http://${HOST}:${PORT}/mcp`);
      console.error(`[MCP] Health check: http://${HOST}:${PORT}/health`);
      if (BEARER_TOKEN) {
        console.error(`[MCP] Authentication: Bearer token required`);
      } else {
        console.error(`[MCP] Authentication: Disabled (set MCP_BEARER_TOKEN to enable)`);
      }
      console.error(`[MCP] Total tools registered: 52 (46 atomic + 6 composite)`);
    });
  } catch (error) {
    console.error('[MCP] Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('[MCP] Shutting down server...');

  // Close all active transports
  for (const sessionId in transports) {
    try {
      await transports[sessionId].close();
    } catch (error) {
      console.error(`[MCP] Error closing transport for session ${sessionId}:`, error);
    }
  }

  // Close MCP server
  await mcpServer.close();

  process.exit(0);
});

// Start the server
main();
