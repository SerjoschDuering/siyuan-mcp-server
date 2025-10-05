/**
 * Attribute Tools Module
 *
 * Provides atomic MCP tools for SiYuan block attribute operations.
 * All tools map 1:1 with SiYuan API endpoints from /api/attr/*
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { siyuanClient } from '../client.js';

/**
 * Register all attribute-related tools with the MCP server
 * @param server - The MCP server instance
 */
export function registerAttributeTools(server: McpServer) {
  /**
   * Tool: siyuan_getBlockAttrs
   * Get all attributes of a specific block
   * API: /api/attr/getBlockAttrs
   */
  server.tool(
    'siyuan_getBlockAttrs',
    'Get all attributes of a specific block by its ID, including custom attributes',
    {
      id: z.string().describe('Block ID (e.g., "20210912214605-uhi5gco")')
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ id }, _extra) => {
      const response = await siyuanClient.post('/api/attr/getBlockAttrs', {
        id
      });

      const attrs = response.data.data;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(attrs, null, 2)
        }],
      };
    }
  );

  /**
   * Tool: siyuan_setBlockAttrs
   * Set attributes for a specific block
   * API: /api/attr/setBlockAttrs
   */
  server.tool(
    'siyuan_setBlockAttrs',
    'Set attributes for a specific block. Custom attributes must be prefixed with "custom-"',
    {
      id: z.string().describe('Block ID (e.g., "20210912214605-uhi5gco")'),
      attrs: z.record(z.string()).describe('Attributes object with key-value pairs. Custom attributes must have "custom-" prefix (e.g., {"custom-attr1": "value"})')
    },
    async ({ id, attrs }, _extra) => {
      const response = await siyuanClient.post('/api/attr/setBlockAttrs', {
        id,
        attrs
      });

      return {
        content: [{
          type: 'text',
          text: `Block ${id} attributes updated successfully`
        }],
      };
    }
  );
}
