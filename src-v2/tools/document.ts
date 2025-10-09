/**
 * Document Tools Module
 * Implements all 7 document-related atomic tools for SiYuan MCP Server v2.0
 *
 * API Reference: docs/siyuan_API.md lines 316-590
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { siyuanClient } from '../client.js';

/**
 * Register all document-related tools
 */
export function registerDocumentTools(server: McpServer) {

  // ============================================================================
  // 1. siyuan_createDocWithMd - Create a document with Markdown
  // ============================================================================

  server.tool(
    'siyuan_createDocWithMd',
    'Create a new document with Markdown content. Path must start with / and separate levels with /. If you use the same path repeatedly, the existing document will not be overwritten.',
    {
      notebook: z.string().describe('Notebook ID (e.g., "20210817205410-2kvfpfn")'),
      path: z.string().describe('Document path starting with / (e.g., "/foo/bar"). Corresponds to database hpath field'),
      markdown: z.string().describe('GFM Markdown content for the document'),
    },
    async ({ notebook, path, markdown }, _extra) => {
      const response = await siyuanClient.post('/api/filetree/createDocWithMd', {
        notebook,
        path,
        markdown,
      });

      const docId = response.data.data;

      return {
        content: [
          {
            type: 'text',
            text: `Document created successfully.\nDocument ID: ${docId}\nNotebook: ${notebook}\nPath: ${path}`,
          },
        ],
      };
    }
  );

  // ============================================================================
  // 2. siyuan_renameDocByID - Rename a document by ID
  // ============================================================================

  server.tool(
    'siyuan_renameDocByID',
    'Rename a document by its ID. Preferred method when you have the document ID. This operation is idempotent.',
    {
      id: z.string().describe('Document ID (e.g., "20210902210113-0avi12f")'),
      title: z.string().describe('New document title'),
    },
    async ({ id, title }, _extra) => {
      const response = await siyuanClient.post('/api/filetree/renameDocByID', {
        id,
        title,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Document renamed successfully.\nDocument ID: ${id}\nNew title: ${title}`,
          },
        ],
      };
    }
  );

  // ============================================================================
  // 3. siyuan_removeDocByID - Remove a document by ID
  // ============================================================================

  server.tool(
    'siyuan_removeDocByID',
    'Remove (delete) a document by its ID. This is a destructive and idempotent operation. Preferred method when you have the document ID.',
    {
      id: z.string().describe('Document ID (e.g., "20210902210113-0avi12f")'),
    },
    { destructiveHint: true },
    async ({ id }, _extra) => {
      const response = await siyuanClient.post('/api/filetree/removeDocByID', {
        id,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Document removed successfully.\nDocument ID: ${id}`,
          },
        ],
      };
    }
  );

  // ============================================================================
  // 4. siyuan_moveDocsByID - Move documents by IDs
  // ============================================================================

  server.tool(
    'siyuan_moveDocsByID',
    'Move one or more documents by their IDs to a target parent document or notebook',
    {
      fromIDs: z.array(z.string()).describe('Source document IDs (e.g., ["20210917220056-yxtyl7i"])'),
      toID: z.string().describe('Target parent document ID or notebook ID (e.g., "20210817205410-2kvfpfn")'),
    },
    async ({ fromIDs, toID }, _extra) => {
      const response = await siyuanClient.post('/api/filetree/moveDocsByID', {
        fromIDs,
        toID,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Documents moved successfully.\nFrom IDs: ${fromIDs.join(', ')}\nTo ID: ${toID}`,
          },
        ],
      };
    }
  );

  // ============================================================================
  // 5. siyuan_getHPathByID - Get human-readable path by ID
  // ============================================================================

  server.tool(
    'siyuan_getHPathByID',
    'Get the human-readable path of a document or block based on its ID. This is a read-only and idempotent operation.',
    {
      id: z.string().describe('Block ID (e.g., "20210917220056-yxtyl7i")'),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ id }, _extra) => {
      const response = await siyuanClient.post('/api/filetree/getHPathByID', {
        id,
      });

      const hPath = response.data.data;

      return {
        content: [
          {
            type: 'text',
            text: `Human-readable path: ${hPath}\n\nBlock ID: ${id}`,
          },
        ],
      };
    }
  );

  // ============================================================================
  // 10. siyuan_getIDsByHPath - Get IDs by human-readable path
  // ============================================================================

  server.tool(
    'siyuan_getIDsByHPath',
    'Get document IDs based on a human-readable path within a notebook. This is a read-only and idempotent operation.',
    {
      path: z.string().describe('Human-readable path (e.g., "/foo/bar")'),
      notebook: z.string().describe('Notebook ID (e.g., "20210808180117-czj9bvb")'),
    },
    { readOnlyHint: true },
    async ({ path, notebook }, _extra) => {
      const response = await siyuanClient.post('/api/filetree/getIDsByHPath', {
        path,
        notebook,
      });

      const ids = response.data.data;
      const idCount = ids?.length || 0;

      return {
        content: [
          {
            type: 'text',
            text: `Found ${idCount} document(s):\n\nIDs: ${JSON.stringify(ids, null, 2)}\n\nPath: ${path}\nNotebook: ${notebook}`,
          },
        ],
      };
    }
  );

  // ============================================================================
  // 11. siyuan_getPathByID - Get storage path by ID
  // ============================================================================

  server.tool(
    'siyuan_getPathByID',
    'Get the storage path (notebook and path) of a document or block based on its ID. This is a read-only and idempotent operation.',
    {
      id: z.string().describe('Block ID (e.g., "20210808180320-fqgskfj")'),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ id }, _extra) => {
      const response = await siyuanClient.post('/api/filetree/getPathByID', {
        id,
      });

      const pathData = response.data.data;

      return {
        content: [
          {
            type: 'text',
            text: `Storage path information:\n\nNotebook: ${pathData.notebook}\nPath: ${pathData.path}\n\nBlock ID: ${id}`,
          },
        ],
      };
    }
  );
}
