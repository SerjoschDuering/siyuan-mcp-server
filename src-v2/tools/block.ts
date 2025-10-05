/**
 * Block Tools Module
 * Implements all 11 block-related atomic tools for SiYuan MCP Server v2.0
 *
 * API Reference: docs/siyuan_API.md lines 625-1018
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { siyuanClient } from '../client.js';

/**
 * Register all block-related tools
 */
export function registerBlockTools(server: McpServer) {

  // ============================================================================
  // 1. siyuan_insertBlock - Insert a block at a specific position
  // ============================================================================

  server.tool(
    'siyuan_insertBlock',
    'Insert a new block at a specific position using nextID, previousID, or parentID as anchors. Priority: nextID > previousID > parentID',
    {
      dataType: z.enum(['markdown', 'dom']).describe('The data type to be inserted: "markdown" or "dom"'),
      data: z.string().describe('Data to be inserted (e.g., "foo**bar**{: style=\\"color: var(--b3-font-color8);\\"}baz")'),
      nextID: z.string().optional().describe('The ID of the next block (used to anchor the insertion position)'),
      previousID: z.string().optional().describe('The ID of the previous block (used to anchor the insertion position)'),
      parentID: z.string().optional().describe('The ID of the parent block (used to anchor the insertion position)')
    },
    async ({ dataType, data, nextID, previousID, parentID }, _extra) => {
      const response = await siyuanClient.post('/api/block/insertBlock', {
        dataType,
        data,
        nextID: nextID || '',
        previousID: previousID || '',
        parentID: parentID || ''
      });

      const operations = response.data.data;
      const insertedBlockId = operations[0]?.doOperations[0]?.id;

      return {
        content: [{
          type: 'text',
          text: `Block inserted successfully.\nNew Block ID: ${insertedBlockId}\n\nOperations:\n${JSON.stringify(operations, null, 2)}`
        }],
      };
    }
  );

  // ============================================================================
  // 2. siyuan_prependBlock - Prepend a block as first child
  // ============================================================================

  server.tool(
    'siyuan_prependBlock',
    'Prepend a new block as the first child of a parent block',
    {
      dataType: z.enum(['markdown', 'dom']).describe('The data type to be inserted: "markdown" or "dom"'),
      data: z.string().describe('Data to be inserted (e.g., "foo**bar**{: style=\\"color: var(--b3-font-color8);\\"}baz")'),
      parentID: z.string().describe('The ID of the parent block')
    },
    async ({ dataType, data, parentID }, _extra) => {
      const response = await siyuanClient.post('/api/block/prependBlock', {
        dataType,
        data,
        parentID
      });

      const operations = response.data.data;
      const insertedBlockId = operations[0]?.doOperations[0]?.id;

      return {
        content: [{
          type: 'text',
          text: `Block prepended successfully.\nNew Block ID: ${insertedBlockId}\nParent ID: ${parentID}\n\nOperations:\n${JSON.stringify(operations, null, 2)}`
        }],
      };
    }
  );

  // ============================================================================
  // 3. siyuan_appendBlock - Append a block as last child
  // ============================================================================

  server.tool(
    'siyuan_appendBlock',
    'Append a new block as the last child of a parent block',
    {
      dataType: z.enum(['markdown', 'dom']).describe('The data type to be inserted: "markdown" or "dom"'),
      data: z.string().describe('Data to be inserted (e.g., "foo**bar**{: style=\\"color: var(--b3-font-color8);\\"}baz")'),
      parentID: z.string().describe('The ID of the parent block')
    },
    async ({ dataType, data, parentID }, _extra) => {
      const response = await siyuanClient.post('/api/block/appendBlock', {
        dataType,
        data,
        parentID
      });

      const operations = response.data.data;
      const insertedBlockId = operations[0]?.doOperations[0]?.id;

      return {
        content: [{
          type: 'text',
          text: `Block appended successfully.\nNew Block ID: ${insertedBlockId}\nParent ID: ${parentID}\n\nOperations:\n${JSON.stringify(operations, null, 2)}`
        }],
      };
    }
  );

  // ============================================================================
  // 4. siyuan_updateBlock - Update an existing block
  // ============================================================================

  server.tool(
    'siyuan_updateBlock',
    'Update the content of an existing block by its ID',
    {
      dataType: z.enum(['markdown', 'dom']).describe('The data type to be updated: "markdown" or "dom"'),
      data: z.string().describe('Updated data for the block'),
      id: z.string().describe('ID of the block to be updated (e.g., "20211230161520-querkps")')
    },
    { idempotentHint: true },
    async ({ dataType, data, id }, _extra) => {
      const response = await siyuanClient.post('/api/block/updateBlock', {
        dataType,
        data,
        id
      });

      const operations = response.data.data;

      return {
        content: [{
          type: 'text',
          text: `Block updated successfully.\nBlock ID: ${id}\n\nOperations:\n${JSON.stringify(operations, null, 2)}`
        }],
      };
    }
  );

  // ============================================================================
  // 5. siyuan_deleteBlock - Delete a block
  // ============================================================================

  server.tool(
    'siyuan_deleteBlock',
    'Delete a block by its ID. WARNING: This operation is destructive and cannot be undone.',
    {
      id: z.string().describe('ID of the block to be deleted (e.g., "20211230161520-querkps")')
    },
    { destructiveHint: true },
    async ({ id }, _extra) => {
      const response = await siyuanClient.post('/api/block/deleteBlock', {
        id
      });

      const operations = response.data.data;

      return {
        content: [{
          type: 'text',
          text: `Block deleted successfully.\nDeleted Block ID: ${id}\n\nOperations:\n${JSON.stringify(operations, null, 2)}`
        }],
      };
    }
  );

  // ============================================================================
  // 6. siyuan_moveBlock - Move a block to a new position
  // ============================================================================

  server.tool(
    'siyuan_moveBlock',
    'Move a block to a new position using previousID and/or parentID as anchors. If both exist, previousID is used first',
    {
      id: z.string().describe('Block ID to move (e.g., "20230406180530-3o1rqkc")'),
      previousID: z.string().optional().describe('The ID of the previous block (used to anchor the insertion position)'),
      parentID: z.string().optional().describe('The ID of the parent block (used to anchor the insertion position)')
    },
    async ({ id, previousID, parentID }, _extra) => {
      const response = await siyuanClient.post('/api/block/moveBlock', {
        id,
        previousID: previousID || '',
        parentID: parentID || ''
      });

      const operations = response.data.data;

      return {
        content: [{
          type: 'text',
          text: `Block moved successfully.\nMoved Block ID: ${id}\nPrevious ID: ${previousID || 'N/A'}\nParent ID: ${parentID || 'N/A'}\n\nOperations:\n${JSON.stringify(operations, null, 2)}`
        }],
      };
    }
  );

  // ============================================================================
  // 7. siyuan_foldBlock - Fold a block
  // ============================================================================

  server.tool(
    'siyuan_foldBlock',
    'Fold a block to hide its children in the UI',
    {
      id: z.string().describe('Block ID to fold (e.g., "20231224160424-2f5680o")')
    },
    async ({ id }, _extra) => {
      const response = await siyuanClient.post('/api/block/foldBlock', {
        id
      });

      return {
        content: [{
          type: 'text',
          text: `Block folded successfully.\nBlock ID: ${id}`
        }],
      };
    }
  );

  // ============================================================================
  // 8. siyuan_unfoldBlock - Unfold a block
  // ============================================================================

  server.tool(
    'siyuan_unfoldBlock',
    'Unfold a block to show its children in the UI',
    {
      id: z.string().describe('Block ID to unfold (e.g., "20231224160424-2f5680o")')
    },
    async ({ id }, _extra) => {
      const response = await siyuanClient.post('/api/block/unfoldBlock', {
        id
      });

      return {
        content: [{
          type: 'text',
          text: `Block unfolded successfully.\nBlock ID: ${id}`
        }],
      };
    }
  );

  // ============================================================================
  // 9. siyuan_getBlockKramdown - Get block kramdown content
  // ============================================================================

  server.tool(
    'siyuan_getBlockKramdown',
    'Get the kramdown (markdown with metadata) content of a block. This is a read-only operation.',
    {
      id: z.string().describe('ID of the block to retrieve (e.g., "20201225220954-dlgzk1o")')
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ id }, _extra) => {
      const response = await siyuanClient.post('/api/block/getBlockKramdown', {
        id
      });

      const blockData = response.data.data;

      return {
        content: [{
          type: 'text',
          text: `Block kramdown retrieved successfully.\nBlock ID: ${blockData.id}\n\nKramdown:\n${blockData.kramdown}`
        }],
      };
    }
  );

  // ============================================================================
  // 10. siyuan_getChildBlocks - Get child blocks of a parent block
  // ============================================================================

  server.tool(
    'siyuan_getChildBlocks',
    'Get all child blocks of a parent block. Blocks below a heading are also counted as child blocks. This is a read-only operation.',
    {
      id: z.string().describe('Parent block ID (e.g., "20230506212712-vt9ajwj")')
    },
    { readOnlyHint: true },
    async ({ id }, _extra) => {
      const response = await siyuanClient.post('/api/block/getChildBlocks', {
        id
      });

      const childBlocks = response.data.data;
      const childCount = childBlocks?.length || 0;

      return {
        content: [{
          type: 'text',
          text: `Found ${childCount} child block(s).\nParent Block ID: ${id}\n\nChild Blocks:\n${JSON.stringify(childBlocks, null, 2)}`
        }],
      };
    }
  );

  // ============================================================================
  // 11. siyuan_transferBlockRef - Transfer block references
  // ============================================================================

  server.tool(
    'siyuan_transferBlockRef',
    'Transfer block references from one def block to another target block. If refIDs is not specified, all ref blocks pointing to fromID will be transferred.',
    {
      fromID: z.string().describe('Def block ID (source of references, e.g., "20230612160235-mv6rrh1")'),
      toID: z.string().describe('Target block ID (destination for references, e.g., "20230613093045-uwcomng")'),
      refIDs: z.array(z.string()).optional().describe('Ref block IDs to transfer (e.g., ["20230613092230-cpyimmd"]). If not specified, all refs will be transferred')
    },
    async ({ fromID, toID, refIDs }, _extra) => {
      const payload: any = {
        fromID,
        toID
      };

      if (refIDs && refIDs.length > 0) {
        payload.refIDs = refIDs;
      }

      const response = await siyuanClient.post('/api/block/transferBlockRef', payload);

      const refCount = refIDs?.length || 'all';

      return {
        content: [{
          type: 'text',
          text: `Block references transferred successfully.\nFrom ID: ${fromID}\nTo ID: ${toID}\nTransferred refs: ${refCount}`
        }],
      };
    }
  );
}
