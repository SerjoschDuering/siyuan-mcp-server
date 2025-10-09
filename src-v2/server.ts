#!/usr/bin/env node

/**
 * SiYuan MCP Server v2.0
 * Streamable HTTP transport - supports multiple concurrent client sessions
 */

import express, { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Import token storage for request-scoped context threading
import { tokenStorage, SiYuanContext } from './client.js';

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
import { registerReferenceTools } from './tools/reference.js';

// Configuration from environment
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';
const BEARER_TOKEN = process.env.MCP_BEARER_TOKEN;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Express app setup
const app = express();
app.use(express.json({ limit: '10mb' })); // Prevent DoS via large payloads

// Session metadata tracking
interface SessionInfo {
  transport: StreamableHTTPServerTransport;
  createdAt: number;
  lastActivity: number;
}

const sessions: { [sessionId: string]: SessionInfo } = {};
const initializationLocks = new Set<string>();
const closingSessions = new Set<string>();

// HTTP server instance for graceful shutdown
let httpServer: Server | null = null;

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
  registerReferenceTools(server);

  return server;
}

// Create server instance (shared across all sessions)
const mcpServer = createMcpServer();

/**
 * Session cleanup interval - removes inactive sessions
 */
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, info] of Object.entries(sessions)) {
    if (now - info.lastActivity > SESSION_TIMEOUT) {
      console.error(`[MCP] Cleaning up inactive session: ${sessionId}`);
      info.transport.close().catch(err =>
        console.error(`[MCP] Error closing inactive session ${sessionId}:`, err)
      );
      delete sessions[sessionId];
    }
  }
}, 60 * 1000); // Check every minute

/**
 * Update session activity timestamp
 */
function updateSessionActivity(sessionId: string): void {
  if (sessions[sessionId]) {
    sessions[sessionId].lastActivity = Date.now();
  }
}

/**
 * Validate session ID format (UUID v4)
 */
function validateSessionId(sessionId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sessionId);
}

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
 * Request logging middleware
 */
app.use((req, res, next) => {
  const start = Date.now();
  const sessionId = req.headers['mcp-session-id'];

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.error(
      `[HTTP] ${req.method} ${req.path} ${res.statusCode} ${duration}ms` +
      (sessionId ? ` session=${sessionId}` : '')
    );
  });

  next();
});

/**
 * Parse combined credentials header format
 * Supports: "token=XXX,url=YYY" or "token=XXX, url=YYY" (with spaces)
 */
function parseCombinedCredentials(combined: string): { token?: string; url?: string } {
  const parts = combined.split(',');
  const result: { token?: string; url?: string } = {};

  for (const part of parts) {
    const [key, value] = part.split('=').map(s => s.trim());
    if (key === 'token' && value) result.token = value;
    if (key === 'url' && value) result.url = value;
  }

  return result;
}

/**
 * Main MCP endpoint handler
 */
async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  // SECURITY: Extract SiYuan credentials from client headers (multi-tenant support)
  // Support two formats for maximum compatibility:
  // 1. Combined header: X-SiYuan-Credentials (for n8n official MCP Client Tool)
  // 2. Separate headers: X-SiYuan-Token + X-SiYuan-URL (for Claude Code, community nodes)

  const combinedCreds = req.headers['x-siyuan-credentials'] as string | undefined;

  let siyuanToken: string | undefined;
  let siyuanUrl: string | undefined;

  if (combinedCreds) {
    // Parse combined format: "token=XXX,url=YYY"
    const parsed = parseCombinedCredentials(combinedCreds);
    siyuanToken = parsed.token;
    siyuanUrl = parsed.url;
  } else {
    // Fall back to separate headers (original format)
    siyuanToken = req.headers['x-siyuan-token'] as string | undefined;
    siyuanUrl = req.headers['x-siyuan-url'] as string | undefined;
  }

  // Validate both token and URL are present
  if (!siyuanToken) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'SiYuan token required. Use either:\n' +
               '  • Separate headers: X-SiYuan-Token and X-SiYuan-URL\n' +
               '  • Combined header: X-SiYuan-Credentials (format: token=XXX,url=YYY)'
    });
    return;
  }

  if (!siyuanUrl) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'SiYuan URL required. Use either:\n' +
               '  • Separate headers: X-SiYuan-Token and X-SiYuan-URL\n' +
               '  • Combined header: X-SiYuan-Credentials (format: token=XXX,url=YYY)'
    });
    return;
  }

  // Validate URL format (basic check)
  try {
    new URL(siyuanUrl);
  } catch (error) {
    res.status(400).json({
      error: 'Bad Request',
      message: `Invalid X-SiYuan-URL format: ${siyuanUrl}. Must be a valid HTTP(S) URL.`
    });
    return;
  }

  // Validate session ID format if provided
  if (sessionId && !validateSessionId(sessionId)) {
    res.status(400).json({ error: 'Invalid session ID format' });
    return;
  }

  // Prevent concurrent initialization from same client (race condition fix)
  const clientIp = req.ip || 'unknown';
  const lockKey = sessionId || clientIp;

  if (!sessionId && isInitializeRequest(req.body)) {
    if (initializationLocks.has(lockKey)) {
      res.status(429).json({ error: 'Initialization already in progress' });
      return;
    }
    initializationLocks.add(lockKey);
  }

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions[sessionId]) {
      // Reuse existing transport for this session
      transport = sessions[sessionId].transport;
      updateSessionActivity(sessionId);
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New session initialization
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          if (closingSessions.has(newSessionId)) return;

          console.error(`[MCP] Session initialized: ${newSessionId}`);
          const now = Date.now();
          sessions[newSessionId] = {
            transport,
            createdAt: now,
            lastActivity: now,
          };
        },
        onsessionclosed: (closedSessionId) => {
          if (closingSessions.has(closedSessionId)) return;
          closingSessions.add(closedSessionId);

          console.error(`[MCP] Session closed: ${closedSessionId}`);
          delete sessions[closedSessionId];

          setTimeout(() => closingSessions.delete(closedSessionId), 1000);
        },
      });

      // Set up transport cleanup on close (prevent race condition)
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && closingSessions.has(sid)) return;
        if (sid && sessions[sid]) {
          closingSessions.add(sid);
          console.error(`[MCP] Transport closed for session ${sid}`);
          delete sessions[sid];
          setTimeout(() => closingSessions.delete(sid), 1000);
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

    // SECURITY: Thread SiYuan context (token + URL) through AsyncLocalStorage for this request
    const context: SiYuanContext = {
      token: siyuanToken,
      apiUrl: siyuanUrl
    };

    await tokenStorage.run(context, async () => {
      await transport.handleRequest(req, res, req.body);
    });
  } catch (error) {
    console.error('[MCP] Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production'
          ? 'An error occurred'
          : (error instanceof Error ? error.message : 'Unknown error'),
      });
    }
  } finally {
    // Release initialization lock
    if (!sessionId && isInitializeRequest(req.body)) {
      initializationLocks.delete(lockKey);
    }
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();

  res.json({
    status: 'ok',
    server: 'siyuan-mcp-server',
    version: '2.0.0',
    transport: 'streamable-http',
    activeSessions: Object.keys(sessions).length,
    uptime: Math.floor(process.uptime()),
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
    },
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
    httpServer = app.listen(PORT, HOST, () => {
      console.error(`[MCP] SiYuan MCP Server v2.0 (Streamable HTTP)`);
      console.error(`[MCP] Listening on http://${HOST}:${PORT}/mcp`);
      console.error(`[MCP] Health check: http://${HOST}:${PORT}/health`);
      if (BEARER_TOKEN) {
        console.error(`[MCP] Authentication: Bearer token required`);
      } else {
        console.error(`[MCP] Authentication: Disabled (set MCP_BEARER_TOKEN to enable)`);
      }
      console.error(`[MCP] Session timeout: ${SESSION_TIMEOUT / 1000 / 60} minutes`);
      console.error(`[MCP] Total tools registered: 53 (47 atomic + 6 composite)`);
    });
  } catch (error) {
    console.error('[MCP] Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string) {
  console.error(`[MCP] Received ${signal}, shutting down gracefully...`);

  // Stop accepting new connections
  if (httpServer) {
    await new Promise<void>((resolve) => {
      httpServer!.close(() => {
        console.error('[MCP] HTTP server closed');
        resolve();
      });
    });
  }

  // Close all active sessions with timeout
  const closePromises = Object.values(sessions).map(info =>
    info.transport.close().catch(err =>
      console.error('[MCP] Transport close error:', err)
    )
  );

  // Wait for all sessions to close (with 5 second timeout)
  await Promise.race([
    Promise.allSettled(closePromises),
    new Promise(resolve => setTimeout(resolve, 5000))
  ]);

  // Close MCP server
  await mcpServer.close();
  console.error('[MCP] Shutdown complete');

  process.exit(0);
}

// Handle graceful shutdown on SIGINT and SIGTERM
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start the server
main();
