#!/usr/bin/env node

/**
 * SiYuan MCP Server v2.0
 * Atomic tools architecture - each SiYuan API endpoint is a direct MCP tool
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

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
    // Register all tools
    registerAllTools();

    // Set up request handlers
    setupHandlers();

    // Start server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Log successful startup to stderr (won't interfere with MCP protocol on stdout)
    console.error('SiYuan MCP Server v2.0 started successfully');
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
