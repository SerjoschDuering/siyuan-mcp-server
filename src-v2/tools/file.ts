/**
 * File Tools Module
 *
 * Provides atomic MCP tools for SiYuan file operations.
 * All tools map 1:1 with SiYuan API endpoints from /api/file/*
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { siyuanClient } from '../client.js';

/**
 * Register all file-related tools with the MCP server
 * @param server - The MCP server instance
 */
export function registerFileTools(server: McpServer) {
  /**
   * Tool: siyuan_getFile
   * Get file content from the workspace
   * API: /api/file/getFile
   */
  server.tool(
    'siyuan_getFile',
    'Get file content from the workspace by its path relative to the workspace directory',
    {
      path: z.string().describe('File path under the workspace path (e.g., "/data/20210808180117-6v0mkxr/20200923234011-ieuun1p.sy")')
    },
    { readOnlyHint: true },
    async ({ path }, _extra) => {
      const response = await siyuanClient.post('/api/file/getFile', {
        path
      });

      // Note: /api/file/getFile returns file content directly with different status codes
      // Status 200: File content
      // Status 202: Error response with code, msg, data
      const fileContent = response.data;

      return {
        content: [{
          type: 'text',
          text: typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent, null, 2)
        }],
        _meta: { path }
      };
    }
  );

  /**
   * Tool: siyuan_removeFile
   * Remove a file from the workspace
   * API: /api/file/removeFile
   */
  server.tool(
    'siyuan_removeFile',
    'Remove (delete) a file from the workspace. WARNING: This operation is destructive and cannot be undone.',
    {
      path: z.string().describe('File path under the workspace path to remove (e.g., "/data/20210808180117-6v0mkxr/20200923234011-ieuun1p.sy")')
    },
    { destructiveHint: true },
    async ({ path }, _extra) => {
      const response = await siyuanClient.post('/api/file/removeFile', {
        path
      });

      return {
        content: [{
          type: 'text',
          text: `File ${path} removed successfully`
        }],
      };
    }
  );

  /**
   * Tool: siyuan_renameFile
   * Rename or move a file within the workspace
   * API: /api/file/renameFile
   */
  server.tool(
    'siyuan_renameFile',
    'Rename or move a file within the workspace by changing its path',
    {
      path: z.string().describe('Current file path under the workspace path (e.g., "/data/assets/image-20230523085812-k3o9t32.png")'),
      newPath: z.string().describe('New file path under the workspace path (e.g., "/data/assets/test-20230523085812-k3o9t32.png")')
    },
    async ({ path, newPath }, _extra) => {
      const response = await siyuanClient.post('/api/file/renameFile', {
        path,
        newPath
      });

      return {
        content: [{
          type: 'text',
          text: `File renamed from ${path} to ${newPath}`
        }],
      };
    }
  );

  /**
   * Tool: siyuan_readDir
   * List files and directories in a directory
   * API: /api/file/readDir
   */
  server.tool(
    'siyuan_readDir',
    'List files and directories in a directory with their metadata (name, type, modification time)',
    {
      path: z.string().describe('Directory path under the workspace path (e.g., "/data/20210808180117-6v0mkxr/20200923234011-ieuun1p")')
    },
    { readOnlyHint: true },
    async ({ path }, _extra) => {
      const response = await siyuanClient.post('/api/file/readDir', {
        path
      });

      const entries = response.data.data;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(entries, null, 2)
        }],
      };
    }
  );

  /**
   * Tool: siyuan_putFile
   * TODO: Deferred to v2.1
   *
   * This endpoint requires HTTP Multipart form data for file upload,
   * which requires special handling beyond simple JSON POST requests.
   *
   * API: /api/file/putFile
   * Parameters:
   * - path: the file path under the workspace path
   * - isDir: whether to create a folder (when true, only create folder, ignore file)
   * - modTime: last access and modification time (Unix time)
   * - file: the uploaded file
   *
   * @see docs/siyuan_API.md lines 1199-1216
   */
}
