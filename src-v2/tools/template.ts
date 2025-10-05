/**
 * Template Tools Module
 *
 * Provides atomic MCP tools for SiYuan template rendering operations.
 * All tools map 1:1 with SiYuan API endpoints from /api/template/*
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { siyuanClient } from '../client.js';

/**
 * Register all template-related tools with the MCP server
 * @param server - The MCP server instance
 */
export function registerTemplateTools(server: McpServer) {
  /**
   * Tool: siyuan_renderTemplate
   * Render a template file at the specified path
   * API: /api/template/render
   */
  server.tool(
    'siyuan_renderTemplate',
    'Render a template file from the specified absolute path in the context of a document',
    {
      id: z.string().describe('ID of the document where the rendering is called (e.g., "20220724223548-j6g0o87")'),
      path: z.string().describe('Template file absolute path (e.g., "F:\\\\SiYuan\\\\data\\\\templates\\\\foo.md")')
    },
    { readOnlyHint: true },
    async ({ id, path }, _extra) => {
      const response = await siyuanClient.post('/api/template/render', {
        id,
        path
      });

      const renderResult = response.data.data;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(renderResult, null, 2)
        }],
      };
    }
  );

  /**
   * Tool: siyuan_renderSprig
   * Render a Sprig template string
   * API: /api/template/renderSprig
   */
  server.tool(
    'siyuan_renderSprig',
    'Render a Sprig template string with date/time functions and other template features',
    {
      template: z.string().describe('Sprig template string (e.g., "/daily note/{{now | date \\"2006/01\\"}}/{{now | date \\"2006-01-02\\"}}")')
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ template }, _extra) => {
      const response = await siyuanClient.post('/api/template/renderSprig', {
        template
      });

      const renderedContent = response.data.data;

      return {
        content: [{
          type: 'text',
          text: typeof renderedContent === 'string' ? renderedContent : JSON.stringify(renderedContent, null, 2)
        }],
      };
    }
  );
}
