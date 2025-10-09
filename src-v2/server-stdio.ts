#!/usr/bin/env node

/**
 * SiYuan MCP Server v2.0 - STDIO Transport (Local Development Only)
 *
 * ⚠️ SECURITY WARNING:
 * STDIO transport requires SIYUAN_TOKEN environment variable.
 * This is LESS SECURE than Streamable HTTP (which gets token from client headers).
 *
 * Use STDIO only for:
 * - Local development
 * - Single-user desktop environments (Claude Desktop on localhost)
 *
 * For production/multi-user deployments, use Streamable HTTP transport instead.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Import token storage for STDIO context threading
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

/**
 * Create and configure the MCP server
 */
const server = new McpServer({
  name: 'siyuan-mcp-server',
  version: '2.0.0',
  capabilities: {
    tools: {},
  },
});

/**
 * Register all SiYuan tools
 */
function registerAllTools() {
  // Register tools by category
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

  // Register composite/smart tools for optimized access
  registerCompositeTools(server);

  // Register reference/documentation tools
  registerReferenceTools(server);
}

/**
 * Set up request handlers
 * Note: McpServer automatically handles ListTools and CallTool requests
 * No manual setup needed for basic tool functionality
 */
function setupHandlers() {
  // McpServer automatically registers handlers for:
  // - tools/list (returns all registered tools)
  // - tools/call (routes to appropriate tool handler)
  // No additional setup required for basic operations
}

/**
 * Main server initialization
 */
async function main() {
  try {
    // STDIO transport requires token and API URL from environment
    const STDIO_TOKEN = process.env.SIYUAN_TOKEN;
    const STDIO_API_URL = process.env.SIYUAN_API_URL || 'http://localhost:6806';

    if (!STDIO_TOKEN) {
      console.error('');
      console.error('❌ ERROR: SIYUAN_TOKEN environment variable is required for STDIO transport');
      console.error('');
      console.error('   Get your token from SiYuan Settings → About');
      console.error('');
      console.error('   Configure Claude Desktop:');
      console.error('   {');
      console.error('     "mcpServers": {');
      console.error('       "siyuan": {');
      console.error('         "command": "node",');
      console.error('         "args": ["/path/to/dist/server-stdio.js"],');
      console.error('         "env": {');
      console.error('           "SIYUAN_TOKEN": "your-token-here",');
      console.error('           "SIYUAN_API_URL": "http://localhost:6806"');
      console.error('         }');
      console.error('       }');
      console.error('     }');
      console.error('   }');
      console.error('');
      console.error('   ⚠️  For production deployments, use Streamable HTTP transport instead');
      console.error('   (sends token from client headers, more secure)');
      console.error('');
      process.exit(1);
    }

    // Register all tools
    registerAllTools();

    // Set up request handlers
    setupHandlers();

    // SECURITY: Thread SiYuan context through AsyncLocalStorage for entire server lifecycle
    // This makes the token and URL available to all API calls without passing them explicitly
    const context: SiYuanContext = {
      token: STDIO_TOKEN,
      apiUrl: STDIO_API_URL
    };

    await tokenStorage.run(context, async () => {
      // Start server with stdio transport
      const transport = new StdioServerTransport();
      await server.connect(transport);

      // Log successful startup to stderr (won't interfere with MCP protocol on stdout)
      console.error('SiYuan MCP Server v2.0 (STDIO) started successfully');
      console.error('⚠️  Using STDIO transport with env var token (local dev only)');
    });
  } catch (error) {
    console.error('Failed to start SiYuan MCP Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down SiYuan MCP Server...');
  await server.close();
  process.exit(0);
});

// Start the server
main();
