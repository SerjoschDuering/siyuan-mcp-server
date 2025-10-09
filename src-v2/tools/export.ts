/**
 * Export Tools Module
 *
 * Provides atomic MCP tools for SiYuan export operations.
 * All tools map 1:1 with SiYuan API endpoints from /api/export/*
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { siyuanClient } from '../client.js';

/**
 * Register all export-related tools with the MCP server
 * @param server - The MCP server instance
 */
export function registerExportTools(server: McpServer) {
  /**
   * Tool: siyuan_exportMarkdown
   * Export a document block as Markdown content
   * API: /api/export/exportMdContent
   */
  server.tool(
    'siyuan_exportMarkdown',
    'Export a document block as Markdown content with its human-readable path',
    {
      id: z.string().describe('ID of the document block to export (e.g., "20210808180117-6v0mkxr")')
    },
    { readOnlyHint: true },
    async ({ id }, _extra) => {
      const response = await siyuanClient.post('/api/export/exportMdContent', {
        id
      }, {
        timeout: 120000 // 2 minutes for exports
      });

      const exportData = response.data.data;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(exportData, null, 2)
        }],
      };
    }
  );

  /**
   * Tool: siyuan_exportResources
   * Export files and folders as a zip archive
   * API: /api/export/exportResources
   */
  server.tool(
    'siyuan_exportResources',
    'Export files and folders as a zip archive. Returns the path to the created zip file.',
    {
      paths: z.array(z.string()).describe('Array of file or folder paths to export (e.g., ["/conf/appearance/boot", "/conf/appearance/langs"])'),
      name: z.string().optional().describe('Optional zip file name (defaults to "export-YYYY-MM-DD_hh-mm-ss.zip" if not set)')
    },
    { readOnlyHint: true },
    async ({ paths, name }, _extra) => {
      const requestBody: { paths: string[]; name?: string } = { paths };
      if (name !== undefined) {
        requestBody.name = name;
      }

      const response = await siyuanClient.post('/api/export/exportResources', requestBody, {
        timeout: 120000 // 2 minutes for exports
      });

      const exportPath = response.data.data;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(exportPath, null, 2)
        }],
      };
    }
  );
}
