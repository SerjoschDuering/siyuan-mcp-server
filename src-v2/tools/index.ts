/**
 * Centralized Tool Registration
 *
 * This module provides a single entry point for registering all SiYuan MCP tools.
 * Ensures both STDIO and HTTP servers register tools consistently.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Import all tool registration functions
import { registerNotebookTools } from './notebook.js';
import { registerDocumentTools } from './document.js';
import { registerBlockTools } from './block.js';
import { registerSearchTools } from './search.js';
import { registerAssetTools } from './asset.js';
import { registerExportTools } from './export.js';
import { registerFileTools } from './file.js';
import { registerAttributeTools } from './attribute.js';
import { registerTemplateTools } from './template.js';
import { registerSystemTools } from './system.js';
import { registerCompositeTools } from './composite.js';
import { registerReferenceTools } from './reference.js';

/**
 * Register all SiYuan MCP tools with the server
 *
 * @param server - The MCP server instance
 */
export function registerAllTools(server: McpServer): void {
  // Atomic tools (1:1 API wrappers)
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

  // Composite tools (multi-step, smart workflows)
  registerCompositeTools(server);

  // Reference tools (documentation and examples)
  registerReferenceTools(server);
}
