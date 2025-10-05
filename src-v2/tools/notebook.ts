/**
 * Notebook Tools Module
 *
 * Provides atomic MCP tools for SiYuan notebook operations.
 * All tools map 1:1 with SiYuan API endpoints from /api/notebook/*
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { siyuanClient } from '../client.js';

/**
 * Register all notebook-related tools with the MCP server
 * @param server - The MCP server instance
 */
export function registerNotebookTools(server: McpServer) {
  /**
   * Tool: siyuan_listNotebooks
   * Lists all notebooks with their IDs, names, icons, and status
   * API: /api/notebook/lsNotebooks
   */
  server.tool(
    'siyuan_listNotebooks',
    'List all notebooks with their IDs, names, icons, sort order, and open/closed status',
    {},
    { readOnlyHint: true, idempotentHint: true },
    async (_extra) => {
      const response = await siyuanClient.post('/api/notebook/lsNotebooks', {});
      const notebooks = response.data.data.notebooks;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(notebooks, null, 2)
        }]
      };
    }
  );

  /**
   * Tool: siyuan_openNotebook
   * Opens a closed notebook by its ID
   * API: /api/notebook/openNotebook
   */
  server.tool(
    'siyuan_openNotebook',
    'Open a closed notebook by its ID',
    {
      notebook: z.string().describe('Notebook ID (e.g., "20210831090520-7dvbdv0")')
    },
    async ({ notebook }, _extra) => {
      const response = await siyuanClient.post('/api/notebook/openNotebook', {
        notebook
      });

      return {
        content: [{
          type: 'text',
          text: `Notebook ${notebook} opened successfully`
        }],
      };
    }
  );

  /**
   * Tool: siyuan_closeNotebook
   * Closes an open notebook by its ID
   * API: /api/notebook/closeNotebook
   */
  server.tool(
    'siyuan_closeNotebook',
    'Close an open notebook by its ID',
    {
      notebook: z.string().describe('Notebook ID (e.g., "20210831090520-7dvbdv0")')
    },
    async ({ notebook }, _extra) => {
      const response = await siyuanClient.post('/api/notebook/closeNotebook', {
        notebook
      });

      return {
        content: [{
          type: 'text',
          text: `Notebook ${notebook} closed successfully`
        }],
      };
    }
  );

  /**
   * Tool: siyuan_renameNotebook
   * Renames an existing notebook
   * API: /api/notebook/renameNotebook
   */
  server.tool(
    'siyuan_renameNotebook',
    'Rename an existing notebook by its ID',
    {
      notebook: z.string().describe('Notebook ID (e.g., "20210831090520-7dvbdv0")'),
      name: z.string().describe('New name for the notebook')
    },
    async ({ notebook, name }, _extra) => {
      const response = await siyuanClient.post('/api/notebook/renameNotebook', {
        notebook,
        name
      });

      return {
        content: [{
          type: 'text',
          text: `Notebook ${notebook} renamed to "${name}"`
        }],
      };
    }
  );

  /**
   * Tool: siyuan_createNotebook
   * Creates a new notebook with the specified name
   * API: /api/notebook/createNotebook
   */
  server.tool(
    'siyuan_createNotebook',
    'Create a new notebook with the specified name',
    {
      name: z.string().describe('Name for the new notebook')
    },
    async ({ name }, _extra) => {
      const response = await siyuanClient.post('/api/notebook/createNotebook', {
        name
      });

      const notebook = response.data.data.notebook;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(notebook, null, 2)
        }],
      };
    }
  );

  /**
   * Tool: siyuan_removeNotebook
   * Removes (deletes) a notebook by its ID
   * API: /api/notebook/removeNotebook
   */
  server.tool(
    'siyuan_removeNotebook',
    'Remove (delete) a notebook by its ID. WARNING: This operation is destructive and cannot be undone.',
    {
      notebook: z.string().describe('Notebook ID to remove (e.g., "20210831090520-7dvbdv0")')
    },
    { destructiveHint: true },
    async ({ notebook }, _extra) => {
      const response = await siyuanClient.post('/api/notebook/removeNotebook', {
        notebook
      });

      return {
        content: [{
          type: 'text',
          text: `Notebook ${notebook} removed successfully`
        }],
      };
    }
  );

  /**
   * Tool: siyuan_getNotebookConf
   * Retrieves the configuration for a specific notebook
   * API: /api/notebook/getNotebookConf
   */
  server.tool(
    'siyuan_getNotebookConf',
    'Get the configuration settings for a specific notebook',
    {
      notebook: z.string().describe('Notebook ID (e.g., "20210817205410-2kvfpfn")')
    },
    { readOnlyHint: true },
    async ({ notebook }, _extra) => {
      const response = await siyuanClient.post('/api/notebook/getNotebookConf', {
        notebook
      });

      const config = response.data.data;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(config, null, 2)
        }],
      };
    }
  );

  /**
   * Tool: siyuan_setNotebookConf
   * Saves configuration settings for a specific notebook
   * API: /api/notebook/setNotebookConf
   */
  server.tool(
    'siyuan_setNotebookConf',
    'Save configuration settings for a specific notebook',
    {
      notebook: z.string().describe('Notebook ID (e.g., "20210817205410-2kvfpfn")'),
      conf: z.object({
        name: z.string().optional().describe('Notebook name'),
        closed: z.boolean().optional().describe('Whether the notebook is closed'),
        refCreateSavePath: z.string().optional().describe('Path for creating reference blocks'),
        createDocNameTemplate: z.string().optional().describe('Template for new document names'),
        dailyNoteSavePath: z.string().optional().describe('Path template for daily notes (e.g., "/daily note/{{now | date \\"2006/01\\"}}/{{now | date \\"2006-01-02\\"}}")'),
        dailyNoteTemplatePath: z.string().optional().describe('Path to daily note template')
      }).passthrough().describe('Configuration object with notebook settings')
    },
    { destructiveHint: true },
    async ({ notebook, conf }, _extra) => {
      const response = await siyuanClient.post('/api/notebook/setNotebookConf', {
        notebook,
        conf
      });

      const updatedConf = response.data.data;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(updatedConf, null, 2)
        }],
      };
    }
  );
}
