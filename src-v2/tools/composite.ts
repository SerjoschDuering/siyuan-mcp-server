/**
 * Composite Tools Module
 *
 * Smart tools that aggregate multiple API calls to provide optimized,
 * hierarchical data structures for LLM consumption. These tools dramatically
 * reduce token usage and improve understanding of notebook structure.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { siyuanClient } from '../client.js';

/**
 * Truncate content to a specified length with ellipsis
 */
function truncateContent(content: string, maxLength: number = 200): string {
  if (!content || content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

/**
 * Format file size in human-readable format
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Register all composite/smart tools with the MCP server
 * @param server - The MCP server instance
 */
export function registerCompositeTools(server: McpServer) {

  /**
   * Tool: siyuan_getContentTree
   * Get hierarchical overview of notebooks and documents with content previews
   * Aggregates multiple API calls into a single structured response
   */
  server.tool(
    'siyuan_getContentTree',
    `Get a hierarchical overview of notebooks and their documents with content previews.

This smart tool aggregates multiple API calls to provide:
- All notebooks with their status
- Document tree structure for each open notebook
- Content previews (first 200 chars) for each document
- Document metadata (size, created, updated)

Perfect for understanding workspace structure without multiple manual calls.`,
    {
      short: z.boolean()
        .optional()
        .default(true)
        .describe('Slim format with just paths and IDs (default: true). Set to false for full metadata.'),
      includeContent: z.boolean()
        .optional()
        .default(true)
        .describe('Include content previews (default: true, ignored if short=true)'),
      maxDepth: z.number()
        .optional()
        .default(3)
        .describe('Maximum tree depth to explore (default: 3)'),
      contentLength: z.number()
        .optional()
        .default(200)
        .describe('Length of content preview (default: 200 chars)')
    },
    { readOnlyHint: true },
    async ({ short, includeContent, maxDepth, contentLength }, _extra) => {
      try {
        // Step 1: Get all notebooks
        const notebooksResponse = await siyuanClient.post('/api/notebook/lsNotebooks', {});
        const notebooks = notebooksResponse.data.data.notebooks || [];

        // Step 2: Build tree structure for each notebook
        const contentTree = await Promise.all(notebooks.map(async (notebook: any) => {
          const notebookInfo: any = {
            id: notebook.id,
            name: notebook.name,
            icon: notebook.icon,
            closed: notebook.closed,
            sort: notebook.sort,
            documents: []
          };

          // Skip closed notebooks unless specifically requested
          if (notebook.closed) {
            notebookInfo.status = 'closed';
            return notebookInfo;
          }

          try {
            // Get documents in this notebook
            const sqlQuery = `
              SELECT id, content, hpath, path, type, created, updated, length(content) as size
              FROM blocks
              WHERE type = 'd' AND box = '${notebook.id}'
              ORDER BY sort ASC
              LIMIT 100
            `;

            const docsResponse = await siyuanClient.post('/api/query/sql', {
              stmt: sqlQuery
            });

            const documents = docsResponse.data.data || [];

            // Process each document
            notebookInfo.documents = await Promise.all(documents.map(async (doc: any) => {
              const docInfo: any = {
                id: doc.id,
                path: doc.hpath || doc.path
              };

              // In short mode, only extract title
              if (short) {
                // Try to extract title from content
                if (doc.content) {
                  const titleMatch = doc.content.match(/^#\s+(.+)$/m);
                  if (titleMatch) {
                    docInfo.title = titleMatch[1];
                  }
                }
              } else {
                // Full mode: add all metadata
                docInfo.created = doc.created;
                docInfo.updated = doc.updated;
                docInfo.size = formatSize(doc.size || 0);

                // Include content preview if requested
                if (includeContent && doc.content) {
                  docInfo.preview = truncateContent(doc.content, contentLength);

                  // Try to extract title from content
                  const titleMatch = doc.content.match(/^#\s+(.+)$/m);
                  if (titleMatch) {
                    docInfo.title = titleMatch[1];
                  }
                }

                // Get child block count for document structure insight
                if (maxDepth > 1) {
                  const countQuery = `
                    SELECT COUNT(*) as count
                    FROM blocks
                    WHERE root_id = '${doc.id}' AND type != 'd'
                  `;

                  try {
                    const countResponse = await siyuanClient.post('/api/query/sql', {
                      stmt: countQuery
                    });
                    docInfo.blockCount = countResponse.data.data[0]?.count || 0;
                  } catch {
                    // Ignore count errors
                  }
                }
              }

              return docInfo;
            }));

            notebookInfo.documentCount = notebookInfo.documents.length;

          } catch (error) {
            notebookInfo.error = 'Failed to load documents';
          }

          return notebookInfo;
        }));

        // Step 3: Generate summary statistics
        const stats = {
          totalNotebooks: notebooks.length,
          openNotebooks: notebooks.filter((n: any) => !n.closed).length,
          totalDocuments: contentTree.reduce((sum, nb) => sum + (nb.documentCount || 0), 0),
          timestamp: new Date().toISOString()
        };

        // Format response as markdown
        let markdown = `# Content Tree${short ? ' (Slim)' : ''}\n\n`;
        markdown += `Found ${stats.totalNotebooks} notebooks (${stats.openNotebooks} open) containing ${stats.totalDocuments} documents\n\n`;

        if (short) {
          // SLIM FORMAT: Super compact tree with just IDs and paths
          for (const notebook of contentTree) {
            const icon = notebook.icon ? String.fromCodePoint(parseInt(notebook.icon, 16)) : '📓';
            markdown += `## ${icon} ${notebook.name}\n`;

            if (notebook.status === 'closed') {
              markdown += `*Closed*\n\n`;
              continue;
            }

            if (notebook.error) {
              markdown += `*Error: ${notebook.error}*\n\n`;
              continue;
            }

            if (!notebook.documents || notebook.documents.length === 0) {
              markdown += `*Empty*\n\n`;
              continue;
            }

            // Just list documents with minimal info
            for (const doc of notebook.documents) {
              const title = doc.title || 'Untitled';
              markdown += `- ${title} → \`${doc.id}\`\n`;
            }

            markdown += `\n`;
          }
        } else {
          // FULL FORMAT: Detailed metadata
          markdown += `## Statistics\n`;
          markdown += `- Total Notebooks: ${stats.totalNotebooks}\n`;
          markdown += `- Open Notebooks: ${stats.openNotebooks}\n`;
          markdown += `- Total Documents: ${stats.totalDocuments}\n`;
          markdown += `- Timestamp: ${stats.timestamp}\n\n`;

          markdown += `## Notebooks\n\n`;

          for (const notebook of contentTree) {
            const icon = notebook.icon ? String.fromCodePoint(parseInt(notebook.icon, 16)) : '📓';
            markdown += `### ${icon} ${notebook.name}\n`;
            markdown += `- ID: \`${notebook.id}\`\n`;
            markdown += `- Status: ${notebook.closed ? 'Closed' : 'Open'}\n`;

            if (notebook.status === 'closed') {
              markdown += `- Documents: N/A (notebook is closed)\n\n`;
              continue;
            }

            if (notebook.error) {
              markdown += `- Error: ${notebook.error}\n\n`;
              continue;
            }

            markdown += `- Documents: ${notebook.documentCount || 0}\n\n`;

            if (notebook.documents && notebook.documents.length > 0) {
              markdown += `#### Documents\n\n`;

              for (let i = 0; i < notebook.documents.length; i++) {
                const doc = notebook.documents[i];
                markdown += `**${i + 1}. ${doc.title || 'Untitled'}** (\`${doc.id}\`)\n`;
                markdown += `- Path: \`${doc.path}\`\n`;
                markdown += `- Size: ${doc.size}\n`;
                if (doc.created) markdown += `- Created: ${doc.created}\n`;
                if (doc.updated) markdown += `- Updated: ${doc.updated}\n`;
                if (doc.blockCount !== undefined) markdown += `- Blocks: ${doc.blockCount}\n`;

                if (doc.preview) {
                  markdown += `- Preview:\n`;
                  const previewLines = doc.preview.split('\n');
                  for (const line of previewLines) {
                    markdown += `  > ${line}\n`;
                  }
                }

                markdown += `\n`;
              }
            }

            markdown += `---\n\n`;
          }
        }

        return {
          content: [{
            type: 'text',
            text: markdown
          }]
        };

      } catch (error) {
        throw new Error(`Failed to build content tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  );

  /**
   * Tool: siyuan_getDocumentOutline
   * Get block-level outline of a document with content structure
   */
  server.tool(
    'siyuan_getDocumentOutline',
    `Get a structured outline of a document showing its block hierarchy.

Returns:
- Heading structure (H1-H6)
- Block types and counts
- Content previews for each section
- Nested structure preservation

Ideal for understanding document organization without reading full content.`,
    {
      documentId: z.string().describe('Document ID to analyze'),
      includeContent: z.boolean()
        .optional()
        .default(true)
        .describe('Include content previews (default: true)'),
      maxDepth: z.number()
        .optional()
        .default(6)
        .describe('Maximum heading depth (default: 6)'),
      contentLength: z.number()
        .optional()
        .default(150)
        .describe('Preview length per block (default: 150 chars)')
    },
    { readOnlyHint: true },
    async ({ documentId, includeContent, maxDepth, contentLength }, _extra) => {
      try {
        // Get document info
        const docQuery = `
          SELECT id, content, hpath, path, created, updated
          FROM blocks
          WHERE id = '${documentId}' AND type = 'd'
        `;

        const docResponse = await siyuanClient.post('/api/query/sql', {
          stmt: docQuery
        });

        const doc = docResponse.data.data[0];
        if (!doc) {
          throw new Error(`Document ${documentId} not found`);
        }

        // Get all blocks in document
        const blocksQuery = `
          SELECT id, parent_id, type, content, markdown, level, subtype
          FROM blocks
          WHERE root_id = '${documentId}'
          ORDER BY sort ASC
          LIMIT 500
        `;

        const blocksResponse = await siyuanClient.post('/api/query/sql', {
          stmt: blocksQuery
        });

        const blocks = blocksResponse.data.data || [];

        // Build hierarchical structure
        const outline: any[] = [];
        const blockMap = new Map();
        const typeCount: Record<string, number> = {};

        // First pass: create block objects and count types
        blocks.forEach((block: any) => {
          typeCount[block.type] = (typeCount[block.type] || 0) + 1;

          const blockInfo: any = {
            id: block.id,
            type: block.type,
            level: block.level,
            children: []
          };

          // Add content based on type
          if (block.type === 'h') {
            // Heading block
            blockInfo.heading = block.markdown || block.content;
            blockInfo.headingLevel = parseInt(block.level || '1');

            if (blockInfo.headingLevel <= maxDepth) {
              if (includeContent) {
                blockInfo.preview = truncateContent(block.content, contentLength);
              }
            }
          } else if (includeContent) {
            // Other block types
            const content = block.markdown || block.content || '';
            if (content) {
              blockInfo.preview = truncateContent(content, contentLength);
            }
          }

          blockMap.set(block.id, blockInfo);
        });

        // Second pass: build hierarchy
        blocks.forEach((block: any) => {
          const blockInfo = blockMap.get(block.id);
          if (!blockInfo) return;

          if (block.parent_id && blockMap.has(block.parent_id)) {
            const parent = blockMap.get(block.parent_id);
            parent.children.push(blockInfo);
          } else {
            outline.push(blockInfo);
          }
        });

        // Extract table of contents from headings
        const toc: any[] = [];
        const extractTOC = (items: any[], level: number = 0) => {
          items.forEach(item => {
            if (item.type === 'h' && item.headingLevel <= maxDepth) {
              toc.push({
                level: item.headingLevel,
                text: item.heading,
                id: item.id,
                indent: '  '.repeat(item.headingLevel - 1)
              });
            }
            if (item.children && item.children.length > 0) {
              extractTOC(item.children, level + 1);
            }
          });
        };
        extractTOC(outline);

        // Build markdown response
        const docTitle = doc.content?.match(/^#\s+(.+)$/m)?.[1] || 'Untitled';

        let markdown = `# Document Outline: ${docTitle}\n\n`;

        markdown += `## Document Info\n`;
        markdown += `- ID: \`${doc.id}\`\n`;
        markdown += `- Path: \`${doc.hpath || doc.path}\`\n`;
        markdown += `- Created: ${doc.created}\n`;
        markdown += `- Updated: ${doc.updated}\n\n`;

        markdown += `## Statistics\n`;
        markdown += `- Total Blocks: ${blocks.length}\n`;
        markdown += `- Headings: ${typeCount['h'] || 0}\n`;
        markdown += `- Paragraphs: ${typeCount['p'] || 0}\n`;
        markdown += `- Lists: ${(typeCount['l'] || 0) + (typeCount['i'] || 0)}\n`;
        markdown += `- Code Blocks: ${typeCount['c'] || 0}\n`;
        markdown += `- Tables: ${typeCount['t'] || 0}\n\n`;

        if (toc.length > 0) {
          markdown += `## Table of Contents\n\n`;
          for (const h of toc) {
            markdown += `${h.indent}• ${h.text}\n`;
          }
          markdown += `\n`;
        }

        markdown += `## Outline\n\n`;

        // Recursive function to render outline as markdown
        const renderOutline = (items: any[], depth: number = 0) => {
          for (const item of items) {
            const indent = '  '.repeat(depth);

            if (item.type === 'h') {
              markdown += `${indent}${'#'.repeat(item.headingLevel)} ${item.heading}\n`;
              if (item.preview && includeContent) {
                markdown += `${indent}  > ${truncateContent(item.preview, 100)}\n`;
              }
            } else if (item.type === 'p' && includeContent) {
              markdown += `${indent}📝 ${truncateContent(item.preview || '', 80)}\n`;
            } else if (item.type === 'l' && includeContent) {
              markdown += `${indent}• ${truncateContent(item.preview || '', 80)}\n`;
            } else if (item.type === 'i' && includeContent) {
              markdown += `${indent}  - ${truncateContent(item.preview || '', 80)}\n`;
            } else if (item.type === 'c' && includeContent) {
              markdown += `${indent}\`\`\`code\`\`\`\n`;
            } else if (item.type === 't' && includeContent) {
              markdown += `${indent}📊 Table\n`;
            }

            if (item.children && item.children.length > 0) {
              renderOutline(item.children, depth + 1);
            }
          }
        };

        renderOutline(outline);

        return {
          content: [{
            type: 'text',
            text: markdown
          }]
        };

      } catch (error) {
        throw new Error(`Failed to generate document outline: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  );

  /**
   * Tool: siyuan_searchWithContext
   * Search with surrounding context for better understanding
   */
  server.tool(
    'siyuan_searchWithContext',
    `Search for content and get results with surrounding context.

Provides:
- Search results with relevance ranking
- Surrounding blocks for context
- Document and notebook information
- Highlighted matches in context

More intelligent than basic search - shows what's around matches.`,
    {
      query: z.string().describe('Search query'),
      contextBlocks: z.number()
        .optional()
        .default(2)
        .describe('Number of blocks before/after to include (default: 2)'),
      maxResults: z.number()
        .optional()
        .default(10)
        .describe('Maximum results to return (default: 10)'),
      searchType: z.enum(['content', 'title', 'all'])
        .optional()
        .default('all')
        .describe('Search in content, titles, or all (default: all)')
    },
    { readOnlyHint: true },
    async ({ query, contextBlocks, maxResults, searchType }, _extra) => {
      try {
        // Build search SQL based on type
        let whereClause = '';
        if (searchType === 'content') {
          whereClause = `WHERE content LIKE '%${query}%'`;
        } else if (searchType === 'title') {
          whereClause = `WHERE type = 'h' AND content LIKE '%${query}%'`;
        } else {
          whereClause = `WHERE content LIKE '%${query}%'`;
        }

        const searchQuery = `
          SELECT id, root_id, parent_id, box, type, content, markdown, hpath, sort
          FROM blocks
          ${whereClause}
          LIMIT ${maxResults}
        `;

        const searchResponse = await siyuanClient.post('/api/query/sql', {
          stmt: searchQuery
        });

        const matches = searchResponse.data.data || [];

        // Get context for each match
        const resultsWithContext = await Promise.all(matches.map(async (match: any) => {
          const result: any = {
            id: match.id,
            type: match.type,
            content: match.content,
            documentId: match.root_id,
            notebookId: match.box
          };

          // Highlight matches in content
          if (match.content) {
            const regex = new RegExp(`(${query})`, 'gi');
            result.highlighted = match.content.replace(regex, '**$1**');
            result.preview = truncateContent(result.highlighted, 300);
          }

          // Get surrounding context blocks
          if (contextBlocks > 0 && match.sort) {
            const contextQuery = `
              SELECT id, type, content, sort
              FROM blocks
              WHERE root_id = '${match.root_id}'
                AND sort >= ${match.sort - contextBlocks}
                AND sort <= ${match.sort + contextBlocks}
              ORDER BY sort ASC
            `;

            try {
              const contextResponse = await siyuanClient.post('/api/query/sql', {
                stmt: contextQuery
              });

              const contextBlocksList = contextResponse.data.data || [];

              result.context = {
                before: [],
                after: []
              };

              contextBlocksList.forEach((block: any) => {
                if (block.id === match.id) return; // Skip the match itself

                const contextBlock = {
                  type: block.type,
                  content: truncateContent(block.content, 150)
                };

                if (block.sort < match.sort) {
                  result.context.before.push(contextBlock);
                } else {
                  result.context.after.push(contextBlock);
                }
              });
            } catch {
              // Context fetch failed, continue without context
            }
          }

          // Get document and notebook info
          try {
            const docQuery = `
              SELECT content, hpath
              FROM blocks
              WHERE id = '${match.root_id}' AND type = 'd'
            `;

            const docResponse = await siyuanClient.post('/api/query/sql', {
              stmt: docQuery
            });

            const doc = docResponse.data.data[0];
            if (doc) {
              result.document = {
                path: doc.hpath,
                title: doc.content?.match(/^#\s+(.+)$/m)?.[1] || 'Untitled'
              };
            }

            // Get notebook name
            const notebookQuery = `
              SELECT content
              FROM blocks
              WHERE id = '${match.box}' AND type = 'notebook'
            `;

            const notebookResponse = await siyuanClient.post('/api/query/sql', {
              stmt: notebookQuery
            });

            const notebook = notebookResponse.data.data[0];
            if (notebook) {
              result.notebook = notebook.content;
            }
          } catch {
            // Info fetch failed, continue without
          }

          return result;
        }));

        // Build markdown response
        let markdown = `# Search Results: "${query}"\n\n`;
        markdown += `Found ${resultsWithContext.length} matches (max: ${maxResults})\n\n`;

        if (resultsWithContext.length === 0) {
          markdown += `No matches found.\n`;
        } else {
          markdown += `## Matches\n\n`;

          for (let i = 0; i < resultsWithContext.length; i++) {
            const result = resultsWithContext[i];
            markdown += `### ${i + 1}. Match in ${result.document?.title || 'Unknown Document'}\n`;
            markdown += `- **Location**: \`${result.document?.path || 'Unknown'}\`\n`;
            if (result.notebook) {
              markdown += `- **Notebook**: ${result.notebook}\n`;
            }
            markdown += `- **Block ID**: \`${result.id}\`\n`;
            markdown += `- **Type**: ${result.type}\n\n`;

            // Show context if available
            if (result.context) {
              if (result.context.before && result.context.before.length > 0) {
                markdown += `**Context Before:**\n`;
                for (const block of result.context.before) {
                  markdown += `> ${block.content}\n`;
                }
                markdown += `\n`;
              }

              markdown += `**Match:**\n`;
              markdown += `> 🎯 ${result.preview || result.content}\n\n`;

              if (result.context.after && result.context.after.length > 0) {
                markdown += `**Context After:**\n`;
                for (const block of result.context.after) {
                  markdown += `> ${block.content}\n`;
                }
                markdown += `\n`;
              }
            } else {
              markdown += `**Content:**\n`;
              markdown += `> ${result.preview || result.content}\n\n`;
            }

            markdown += `---\n\n`;
          }
        }

        return {
          content: [{
            type: 'text',
            text: markdown
          }]
        };

      } catch (error) {
        throw new Error(`Search with context failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  );

  /**
   * Tool: siyuan_getRecentContent
   * Get recently modified content across all notebooks
   */
  server.tool(
    'siyuan_getRecentContent',
    `Get recently created or modified content across all notebooks.

Returns:
- Recently modified documents and blocks
- Grouped by time period (today, yesterday, this week, etc.)
- Content previews and statistics
- Most active notebooks

Perfect for understanding what's been worked on recently.`,
    {
      days: z.number()
        .optional()
        .default(7)
        .describe('Number of days to look back (default: 7)'),
      limit: z.number()
        .optional()
        .default(50)
        .describe('Maximum items to return (default: 50)'),
      includeContent: z.boolean()
        .optional()
        .default(true)
        .describe('Include content previews (default: true)')
    },
    { readOnlyHint: true },
    async ({ days, limit, includeContent }, _extra) => {
      try {
        // Calculate date threshold
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        const threshold = dateThreshold.toISOString().replace('T', ' ').substring(0, 19);

        // Get recently modified blocks
        const recentQuery = `
          SELECT id, root_id, box, type, content, created, updated, hpath
          FROM blocks
          WHERE updated > '${threshold}'
            AND type IN ('d', 'h', 'p', 'l', 'c', 't')
          ORDER BY updated DESC
          LIMIT ${limit}
        `;

        const recentResponse = await siyuanClient.post('/api/query/sql', {
          stmt: recentQuery
        });

        const recentBlocks = recentResponse.data.data || [];

        // Group by time period
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const thisWeek = new Date(today);
        thisWeek.setDate(thisWeek.getDate() - 7);

        const grouped: Record<string, any[]> = {
          today: [],
          yesterday: [],
          thisWeek: [],
          older: []
        };

        const notebookActivity: Record<string, number> = {};

        recentBlocks.forEach((block: any) => {
          const updated = new Date(block.updated.replace(' ', 'T'));

          // Track notebook activity
          if (block.box) {
            notebookActivity[block.box] = (notebookActivity[block.box] || 0) + 1;
          }

          const item: any = {
            id: block.id,
            type: block.type,
            updated: block.updated,
            path: block.hpath
          };

          if (includeContent && block.content) {
            item.preview = truncateContent(block.content, 200);

            // Extract title for documents
            if (block.type === 'd') {
              const titleMatch = block.content.match(/^#\s+(.+)$/m);
              if (titleMatch) {
                item.title = titleMatch[1];
              }
            }
          }

          // Categorize by time
          if (updated >= today) {
            grouped.today.push(item);
          } else if (updated >= yesterday) {
            grouped.yesterday.push(item);
          } else if (updated >= thisWeek) {
            grouped.thisWeek.push(item);
          } else {
            grouped.older.push(item);
          }
        });

        // Get notebook names for activity report
        const notebookIds = Object.keys(notebookActivity);
        const notebookNames: Record<string, string> = {};

        if (notebookIds.length > 0) {
          const notebookQuery = `
            SELECT id, content
            FROM blocks
            WHERE id IN (${notebookIds.map(id => `'${id}'`).join(',')})
              AND type = 'notebook'
          `;

          try {
            const notebookResponse = await siyuanClient.post('/api/query/sql', {
              stmt: notebookQuery
            });

            (notebookResponse.data.data || []).forEach((nb: any) => {
              notebookNames[nb.id] = nb.content;
            });
          } catch {
            // Ignore notebook name fetch errors
          }
        }

        // Build activity summary
        const activitySummary = Object.entries(notebookActivity)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([id, count]) => ({
            notebook: notebookNames[id] || id,
            changes: count
          }));

        // Build markdown response
        let markdown = `# Recent Content (Last ${days} days)\n\n`;

        markdown += `## Summary\n`;
        markdown += `- Total Changes: ${recentBlocks.length}\n`;
        markdown += `- Today: ${grouped.today.length}\n`;
        markdown += `- Yesterday: ${grouped.yesterday.length}\n`;
        markdown += `- This Week: ${grouped.thisWeek.length}\n`;
        markdown += `- Older: ${grouped.older.length}\n\n`;

        if (activitySummary.length > 0) {
          markdown += `## Most Active Notebooks\n\n`;
          for (const nb of activitySummary) {
            markdown += `- **${nb.notebook}**: ${nb.changes} changes\n`;
          }
          markdown += `\n`;
        }

        // Helper function to render a group of items
        const renderGroup = (title: string, items: any[]) => {
          if (items.length === 0) return;

          markdown += `## ${title}\n\n`;

          for (const item of items) {
            const icon = item.type === 'd' ? '📄' : item.type === 'h' ? '📌' : '📝';
            markdown += `${icon} **${item.title || 'Untitled'}**\n`;
            markdown += `- Updated: ${item.updated}\n`;
            markdown += `- Path: \`${item.path || 'Unknown'}\`\n`;
            markdown += `- ID: \`${item.id}\`\n`;

            if (item.preview) {
              markdown += `- Preview:\n`;
              markdown += `  > ${item.preview}\n`;
            }

            markdown += `\n`;
          }
        };

        renderGroup('Today', grouped.today);
        renderGroup('Yesterday', grouped.yesterday);
        renderGroup('This Week', grouped.thisWeek);
        renderGroup('Older', grouped.older);

        return {
          content: [{
            type: 'text',
            text: markdown
          }]
        };

      } catch (error) {
        throw new Error(`Failed to get recent content: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  );

  /**
   * Tool: siyuan_getOrCreateDailyNote
   * Get or create today's daily note in a single idempotent call
   * Automates the common workflow of accessing the daily note
   */
  server.tool(
    'siyuan_getOrCreateDailyNote',
    `Get or create today's daily note in a single, idempotent call.

This smart tool automates the daily note workflow:
- Checks if today's note exists
- Creates it using notebook's template if missing
- Returns the note ID either way
- Uses notebook's dailyNoteSavePath configuration

Perfect for "add task to today's note" workflows without manual navigation.`,
    {
      notebookId: z.string()
        .describe('Notebook ID where daily notes are stored')
    },
    { idempotentHint: true },
    async ({ notebookId }, _extra) => {
      try {
        // Step 1: Get notebook configuration
        const configResponse = await siyuanClient.post('/api/notebook/getNotebookConf', {
          notebook: notebookId
        });
        const config = configResponse.data.data.conf;

        if (!config.dailyNoteSavePath) {
          throw new Error('Notebook does not have dailyNoteSavePath configured');
        }

        // Step 2: Render the path template for today
        const pathResponse = await siyuanClient.post('/api/template/renderSprig', {
          template: config.dailyNoteSavePath
        });
        const dailyNotePath = pathResponse.data.data.content;

        // Step 3: Check if document already exists
        const existingDocsResponse = await siyuanClient.post('/api/filetree/getIDsByHPath', {
          notebook: notebookId,
          path: dailyNotePath
        });
        const existingDocs = existingDocsResponse.data.data || [];

        if (existingDocs.length > 0) {
          // Document exists - return it
          const docId = existingDocs[0];

          // Get document content for response
          const docResponse = await siyuanClient.post('/api/query/sql', {
            stmt: `SELECT id, content, created, updated FROM blocks WHERE id = '${docId}' LIMIT 1`
          });
          const doc = docResponse.data.data?.[0];

          // Build markdown response for existing document
          let markdown = `# Daily Note (Existing)\n\n`;
          markdown += `Today's daily note already exists.\n\n`;
          markdown += `## Document Info\n`;
          markdown += `- ID: \`${docId}\`\n`;
          markdown += `- Path: \`${dailyNotePath}\`\n`;

          if (doc) {
            markdown += `- Created: ${doc.created}\n`;
            markdown += `- Updated: ${doc.updated}\n\n`;

            if (doc.content) {
              const preview = truncateContent(doc.content, 300);
              markdown += `## Content Preview\n\n`;
              markdown += `${preview}\n`;
            }
          }

          return {
            content: [{
              type: 'text',
              text: markdown
            }]
          };
        }

        // Step 4: Document doesn't exist - create it
        let markdown = `# ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}\n\n`;

        // Try to use template if configured
        if (config.dailyNoteTemplatePath) {
          try {
            const templateResponse = await siyuanClient.post('/api/template/render', {
              path: config.dailyNoteTemplatePath
            });
            markdown = templateResponse.data.data.content;
          } catch {
            // Template rendering failed - use default markdown
          }
        }

        // Create the document
        const createResponse = await siyuanClient.post('/api/filetree/createDocWithMd', {
          notebook: notebookId,
          path: dailyNotePath,
          markdown
        });
        const newDocId = createResponse.data.data.id;

        // Build markdown response for new document
        let responseMarkdown = `# Daily Note (Created)\n\n`;
        responseMarkdown += `✅ Created today's daily note.\n\n`;
        responseMarkdown += `## Document Info\n`;
        responseMarkdown += `- ID: \`${newDocId}\`\n`;
        responseMarkdown += `- Path: \`${dailyNotePath}\`\n\n`;
        responseMarkdown += `## Initial Content\n\n`;
        responseMarkdown += `${truncateContent(markdown, 300)}\n`;

        return {
          content: [{
            type: 'text',
            text: responseMarkdown
          }]
        };

      } catch (error) {
        throw new Error(`Failed to get or create daily note: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  );

  /**
   * Tool: siyuan_findTasks
   * Find all TODO items across workspace with rich context
   *
   * EXTENSIBILITY DESIGN:
   * Current: Simple status-based filtering (open/completed/all)
   * Future extensions (v2.1+):
   * - Custom task markers (e.g., "- [>]", "- [!]" for priority)
   * - Due date parsing (e.g., "@due(2024-01-15)")
   * - Priority detection (tags like "#p1", "#urgent")
   * - Custom attribute filtering (e.g., custom-status="in-progress")
   * - Grouping options (by notebook, document, priority, due date)
   * - Sorting options (updated, created, alphabetical, priority)
   * - More context types (full block path, related blocks)
   */
  server.tool(
    'siyuan_findTasks',
    `Find all TODO items across your workspace with rich context.

This smart tool provides a dedicated task view:
- Find open, completed, or all tasks
- Filter by notebook or document
- Filter by time period (recent tasks)
- Include parent heading context
- Aggregated statistics

Perfect for "show me my tasks" workflows and task management.`,
    {
      status: z.enum(['open', 'completed', 'all'])
        .optional()
        .default('open')
        .describe('Task status filter (default: open)'),
      notebookId: z.string()
        .optional()
        .describe('Optional: filter by specific notebook'),
      documentId: z.string()
        .optional()
        .describe('Optional: filter by specific document'),
      daysBack: z.number()
        .optional()
        .describe('Optional: only show tasks updated in last N days'),
      includeContext: z.boolean()
        .optional()
        .default(true)
        .describe('Include parent heading context (default: true)'),
      limit: z.number()
        .optional()
        .default(100)
        .describe('Maximum number of tasks to return (default: 100)')
    },
    { readOnlyHint: true },
    async ({ status, notebookId, documentId, daysBack, includeContext, limit }, _extra) => {
      try {
        // Build SQL query for task list items
        let sqlConditions = ["b.type = 'i'"];

        // Add status filter based on markdown patterns
        if (status === 'open') {
          sqlConditions.push("b.markdown LIKE '- [ ] %'");
        } else if (status === 'completed') {
          sqlConditions.push("b.markdown LIKE '- [x] %'");
        } else {
          // 'all' - both open and completed
          sqlConditions.push("(b.markdown LIKE '- [ ] %' OR b.markdown LIKE '- [x] %')");
        }

        // Add optional filters
        if (notebookId) {
          sqlConditions.push(`b.box = '${notebookId}'`);
        }
        if (documentId) {
          sqlConditions.push(`b.root_id = '${documentId}'`);
        }
        if (daysBack) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysBack);
          const cutoffStr = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');
          sqlConditions.push(`b.updated >= '${cutoffStr}'`);
        }

        const sqlQuery = `
          SELECT
            b.id,
            b.markdown,
            b.content,
            b.root_id,
            b.box,
            b.hpath,
            b.updated,
            b.parent_id
          FROM blocks b
          WHERE ${sqlConditions.join(' AND ')}
          ORDER BY b.updated DESC
          LIMIT ${limit}
        `;

        // Execute query
        const tasksResponse = await siyuanClient.post('/api/query/sql', {
          stmt: sqlQuery
        });
        const tasks = tasksResponse.data.data || [];

        // Step 2: Enrich tasks with context
        const enrichedTasks: any[] = [];
        const docIds = new Set<string>();
        const notebookIds = new Set<string>();

        for (const task of tasks) {
          docIds.add(task.root_id);
          notebookIds.add(task.box);

          // Extract task text (remove checkbox markdown)
          const taskText = task.markdown.replace(/^- \[([ x])\] /, '');
          const isCompleted = task.markdown.includes('[x]');

          const enrichedTask: any = {
            id: task.id,
            text: taskText,
            completed: isCompleted,
            updated: task.updated,
            documentId: task.root_id,
            notebookId: task.box,
            path: task.hpath
          };

          // Get parent heading context if requested
          if (includeContext && task.parent_id) {
            try {
              const parentResponse = await siyuanClient.post('/api/query/sql', {
                stmt: `SELECT content, type FROM blocks WHERE id = '${task.parent_id}' LIMIT 1`
              });
              const parent = parentResponse.data.data?.[0];
              if (parent && parent.type === 'h') {
                enrichedTask.context = parent.content;
              }
            } catch {
              // Ignore context fetch errors
            }
          }

          enrichedTasks.push(enrichedTask);
        }

        // Step 3: Get document and notebook names for enrichment
        const docNames: Record<string, string> = {};
        const notebookNames: Record<string, string> = {};

        if (docIds.size > 0) {
          const docQuery = `
            SELECT id, content FROM blocks
            WHERE id IN (${Array.from(docIds).map(id => `'${id}'`).join(',')})
              AND type = 'd'
          `;
          try {
            const docResponse = await siyuanClient.post('/api/query/sql', { stmt: docQuery });
            (docResponse.data.data || []).forEach((doc: any) => {
              docNames[doc.id] = doc.content;
            });
          } catch {
            // Ignore doc name fetch errors
          }
        }

        // Get notebook names
        try {
          const notebooksResponse = await siyuanClient.post('/api/notebook/lsNotebooks', {});
          (notebooksResponse.data.data.notebooks || []).forEach((nb: any) => {
            notebookNames[nb.id] = nb.name;
          });
        } catch {
          // Ignore notebook fetch errors
        }

        // Step 4: Add names to enriched tasks
        enrichedTasks.forEach(task => {
          task.document = {
            id: task.documentId,
            title: docNames[task.documentId] || 'Untitled'
          };
          task.notebook = {
            id: task.notebookId,
            name: notebookNames[task.notebookId] || 'Unknown'
          };
          delete task.documentId;
          delete task.notebookId;
        });

        // Step 5: Build statistics
        const stats: any = {
          total: enrichedTasks.length,
          open: enrichedTasks.filter(t => !t.completed).length,
          completed: enrichedTasks.filter(t => t.completed).length
        };

        // Group by notebook
        const byNotebook: Record<string, number> = {};
        enrichedTasks.forEach(task => {
          const nb = task.notebook.name;
          byNotebook[nb] = (byNotebook[nb] || 0) + 1;
        });
        stats.byNotebook = byNotebook;

        // Build markdown response
        let markdown = `# Tasks (${status})\n\n`;

        markdown += `## Summary\n`;
        markdown += `- Total Tasks: ${stats.total}\n`;
        markdown += `- Open: ${stats.open}\n`;
        markdown += `- Completed: ${stats.completed}\n\n`;

        if (Object.keys(stats.byNotebook).length > 0) {
          markdown += `### Tasks by Notebook\n`;
          for (const [notebook, count] of Object.entries(stats.byNotebook)) {
            markdown += `- **${notebook}**: ${count}\n`;
          }
          markdown += `\n`;
        }

        if (enrichedTasks.length === 0) {
          markdown += `No ${status} tasks found.\n`;
        } else {
          markdown += `## Task List\n\n`;

          for (let i = 0; i < enrichedTasks.length; i++) {
            const task = enrichedTasks[i];
            const checkbox = task.completed ? '[x]' : '[ ]';
            const emoji = task.completed ? '✅' : '⬜';

            markdown += `### ${i + 1}. ${emoji} ${task.text}\n`;
            markdown += `- Status: ${checkbox}\n`;
            markdown += `- Document: **${task.document.title}**\n`;
            markdown += `- Path: \`${task.path}\`\n`;
            markdown += `- Notebook: ${task.notebook.name}\n`;
            markdown += `- Updated: ${task.updated}\n`;
            markdown += `- Task ID: \`${task.id}\`\n`;

            if (task.context) {
              markdown += `- Context: "${task.context}"\n`;
            }

            markdown += `\n`;
          }
        }

        return {
          content: [{
            type: 'text',
            text: markdown
          }]
        };

      } catch (error) {
        throw new Error(`Failed to find tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  );
}