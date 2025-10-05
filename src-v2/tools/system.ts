/**
 * System Tools Module
 *
 * Provides atomic MCP tools for SiYuan system information operations.
 * All tools map 1:1 with SiYuan API endpoints from /api/system/*
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { siyuanClient } from '../client.js';

/**
 * Register all system-related tools with the MCP server
 * @param server - The MCP server instance
 */
export function registerSystemTools(server: McpServer) {
  /**
   * Tool: siyuan_bootProgress
   * Get the current boot progress of SiYuan
   * API: /api/system/bootProgress
   */
  server.tool(
    'siyuan_bootProgress',
    'Get the current boot progress of SiYuan with details and percentage',
    {},
    { readOnlyHint: true },
    async (_extra) => {
      const response = await siyuanClient.post('/api/system/bootProgress', {});

      const progress = response.data.data;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(progress, null, 2)
        }],
      };
    }
  );

  /**
   * Tool: siyuan_version
   * Get the current version of SiYuan
   * API: /api/system/version
   */
  server.tool(
    'siyuan_version',
    'Get the current version of SiYuan',
    {},
    { readOnlyHint: true, idempotentHint: true },
    async (_extra) => {
      const response = await siyuanClient.post('/api/system/version', {});

      const version = response.data.data;

      return {
        content: [{
          type: 'text',
          text: typeof version === 'string' ? version : JSON.stringify(version, null, 2)
        }],
      };
    }
  );

  /**
   * Tool: siyuan_currentTime
   * Get the current time of the system in milliseconds
   * API: /api/system/currentTime
   */
  server.tool(
    'siyuan_currentTime',
    'Get the current time of the system as Unix timestamp in milliseconds',
    {},
    { readOnlyHint: true },
    async (_extra) => {
      const response = await siyuanClient.post('/api/system/currentTime', {});

      const timestamp = response.data.data;

      return {
        content: [{
          type: 'text',
          text: typeof timestamp === 'number' ? timestamp.toString() : JSON.stringify(timestamp, null, 2)
        }],
      };
    }
  );
}
