/**
 * Reference Tools Module
 * Provides examples, patterns, and documentation to help agents use SiYuan effectively
 *
 * TODO: Load content from external files (resources/reference-docs/) for better maintainability
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Register all reference/documentation tools
 */
export function registerReferenceTools(server: McpServer): void {
  // ============================================================================
  // 1. siyuan_getSQLExamples - Common SQL query examples
  // ============================================================================

  server.tool(
    'siyuan_getSQLExamples',
    'Get common SQL query examples for the SiYuan database. Returns examples for finding tags, backlinks, TODO items, recent content, and more.',
    {},
    { readOnlyHint: true, idempotentHint: true },
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: '# SiYuan SQL Query Examples\n\nTODO: Add comprehensive SQL examples here',
          },
        ],
      };
    }
  );

  // ============================================================================
  // 2. siyuan_getChartExamples - Chart and visualization examples
  // ============================================================================

  server.tool(
    'siyuan_getChartExamples',
    'Get examples for creating charts and visualizations in SiYuan (Mermaid, ECharts, PlantUML). Returns syntax and examples.',
    {},
    { readOnlyHint: true, idempotentHint: true },
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: '# SiYuan Chart & Visualization Examples\n\nTODO: Add Mermaid, ECharts, PlantUML examples here',
          },
        ],
      };
    }
  );

  // ============================================================================
  // 3. siyuan_getTemplateExamples - Template usage examples
  // ============================================================================

  server.tool(
    'siyuan_getTemplateExamples',
    'Get examples for using SiYuan templates with Sprig functions. Shows common template patterns and syntax.',
    {},
    { readOnlyHint: true, idempotentHint: true },
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: '# SiYuan Template Examples\n\nTODO: Add template and Sprig function examples here',
          },
        ],
      };
    }
  );

  // ============================================================================
  // 4. siyuan_getSearchPatterns - Advanced search patterns
  // ============================================================================

  server.tool(
    'siyuan_getSearchPatterns',
    'Get advanced search patterns and techniques for finding content in SiYuan. Covers SQL, keywords, and composite tool usage.',
    {},
    { readOnlyHint: true, idempotentHint: true },
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: '# SiYuan Advanced Search Patterns\n\nTODO: Add advanced search strategy examples here',
          },
        ],
      };
    }
  );
}
