/**
 * Search Tools Module
 *
 * Provides atomic MCP tools for SiYuan SQL query and transaction operations.
 * All tools map 1:1 with SiYuan API endpoints from /api/query/* and /api/sqlite/*
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { siyuanClient } from '../client.js';

/**
 * Register all search-related tools with the MCP server
 * @param server - The MCP server instance
 */
export function registerSearchTools(server: McpServer) {
  /**
   * Tool: siyuan_sql
   * Execute SQL query against SiYuan's database
   * API: /api/query/sql
   */
  server.tool(
    'siyuan_sql',
    `Execute SQL query against SiYuan database to search and query blocks, documents, and other data.

IMPORTANT - Common Query Examples:
1. List all notebooks:
   SELECT * FROM blocks WHERE type = 'notebook'

2. Search blocks by content (ALWAYS use LIMIT):
   SELECT id, type, content FROM blocks WHERE content LIKE '%keyword%' LIMIT 10

3. Get documents in a notebook:
   SELECT * FROM blocks WHERE type = 'd' AND box = '20210808180117-czj9bvb'

4. Find recent blocks (ALWAYS include created/updated):
   SELECT id, content, updated FROM blocks WHERE type = 'p' ORDER BY updated DESC LIMIT 10

5. Get block with specific attributes:
   SELECT * FROM blocks WHERE id = '20210808180117-6v0mkxr'

Schema Tips:
- Main table: 'blocks' (contains all content blocks)
- Key columns: id, parent_id, root_id, box (notebook ID), path, type, content, created, updated
- Common types: 'notebook', 'd' (document), 'h' (heading), 'p' (paragraph), 'l' (list), 'i' (list item)
- ALWAYS use LIMIT to avoid overwhelming responses
- Use LIKE '%term%' for text search (case-insensitive)`,
    {
      stmt: z.string().describe('SQL statement - Use examples above as reference. ALWAYS include LIMIT clause for searches.')
    },
    { readOnlyHint: true },
    async ({ stmt }, _extra) => {
      try {
        const response = await siyuanClient.post('/api/query/sql', {
          stmt
        });

        const rows = response.data.data;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(rows, null, 2)
          }],
        };
      } catch (error) {
        // Enhanced error message with examples
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const helpfulError = `SQL Query Failed: ${errorMsg}

Common fixes:
- Check table name is 'blocks' (not 'block' or 'notes')
- Verify column names: id, parent_id, root_id, box, path, type, content, created, updated
- Use single quotes for strings: WHERE type = 'notebook'
- Add LIMIT clause: LIMIT 10
- For text search use: WHERE content LIKE '%keyword%'

Example working queries:
SELECT * FROM blocks WHERE type = 'notebook'
SELECT id, content FROM blocks WHERE content LIKE '%search term%' LIMIT 10
SELECT * FROM blocks WHERE type = 'd' AND box = '20210808180117-czj9bvb' LIMIT 20`;

        throw new Error(helpfulError);
      }
    }
  );

  /**
   * Tool: siyuan_flushTransaction
   * Flush pending database transaction to disk
   * API: /api/sqlite/flushTransaction
   */
  server.tool(
    'siyuan_flushTransaction',
    'Flush pending database transaction to ensure all changes are persisted to disk',
    {},
    async (_extra) => {
      const response = await siyuanClient.post('/api/sqlite/flushTransaction', {});

      return {
        content: [{
          type: 'text',
          text: 'Transaction flushed successfully'
        }],
      };
    }
  );
}
