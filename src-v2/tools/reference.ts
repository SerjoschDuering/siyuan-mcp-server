/**
 * Reference Tools Module
 * Provides examples, patterns, and documentation to help agents use SiYuan effectively
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Content constants for each reference category
const SQL_REFERENCE = `# SiYuan SQL Query Examples

## Database Structure
- **blocks**: All content blocks (documents, headings, paragraphs, etc.)
- **attributes**: Custom block attributes
- **refs**: Block references and backlinks
- **spans**: Inline elements within blocks

## Common Queries

### Find Documents
\`\`\`sql
-- By title
SELECT id, content, hpath FROM blocks
WHERE type = 'd' AND content LIKE '%keyword%' LIMIT 20;

-- Recent documents
SELECT id, content, updated FROM blocks
WHERE type = 'd'
ORDER BY updated DESC LIMIT 20;
\`\`\`

### Find Tasks
\`\`\`sql
-- Open tasks
SELECT id, content, path FROM blocks
WHERE markdown LIKE '%- [ ]%'
ORDER BY updated DESC LIMIT 100;
\`\`\`

### Search with Tags
\`\`\`sql
-- Find blocks with specific tag
SELECT id, content FROM blocks
WHERE content LIKE '%#tagname%' LIMIT 50;
\`\`\`

### Find Backlinks
\`\`\`sql
-- References to a block
SELECT b.id, b.content FROM blocks b
JOIN refs r ON b.id = r.block_id
WHERE r.def_block_id = '20240103092549-abc123';
\`\`\`

## Tips
- Always use LIMIT for safety
- Filter by type early (type = 'd' for documents)
- Date format: YYYYMMDDHHMMSS
`;

const CHARTS_REFERENCE = `# SiYuan Chart & Visualization Examples

## ECharts
Paste valid ECharts JSON after typing \`/Chart\`:

### Bar Chart
\`\`\`json
{
  "xAxis": {"type": "category", "data": ["Mon", "Tue", "Wed"]},
  "yAxis": {"type": "value"},
  "series": [{"type": "bar", "data": [120, 200, 150]}]
}
\`\`\`

### Pie Chart
\`\`\`json
{
  "series": [{
    "type": "pie",
    "data": [
      {"value": 335, "name": "Direct"},
      {"value": 310, "name": "Email"},
      {"value": 234, "name": "Ads"}
    ]
  }]
}
\`\`\`

### Line Chart
\`\`\`json
{
  "xAxis": {"type": "category", "data": ["Jan", "Feb", "Mar"]},
  "yAxis": {"type": "value"},
  "series": [{"type": "line", "data": [820, 932, 901]}]
}
\`\`\`

## Mermaid Diagrams

### Flowchart
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[End]
    B -->|No| D[Loop]
    D --> B
\`\`\`

### Sequence Diagram
\`\`\`mermaid
sequenceDiagram
    User->>API: Request
    API->>DB: Query
    DB-->>API: Results
    API-->>User: Response
\`\`\`

## Tips
- All keys must be quoted in JSON
- No trailing commas
- Use string formatters, not JS functions
`;

const TEMPLATES_REFERENCE = `# SiYuan Template Examples

## Syntax
\`\`\`gotemplate
.action{ expression }  // Preferred
{{ expression }}       // Alternative
\`\`\`

## Date Functions
\`\`\`gotemplate
.action{ now | date "2006-01-02" }           // 2024-01-09
.action{ now | date "Monday, Jan 2" }        // Monday, Jan 9
.action{ ISOWeek now }                       // Week number
.action{ Weekday now }                       // 0=Sunday, 6=Saturday

// Yesterday
.action{ (now.AddDate 0 0 -1) | date "2006-01-02" }
\`\`\`

## Control Flow
\`\`\`gotemplate
.action{ if eq (Weekday now) 1 }
## Monday Planning
- [ ] Weekly review
.action{ else }
## Daily Tasks
- [ ] Regular work
.action{ end }
\`\`\`

## Loops
\`\`\`gotemplate
.action{ range $i := until 5 }
- Task .action{ add $i 1 }
.action{ end }
\`\`\`

## Template Variables
\`\`\`gotemplate
.action{ .title }      // Document title
.action{ .id }         // Document ID
.action{ .name }       // Notebook name
\`\`\`

## Daily Note Template
\`\`\`gotemplate
# .action{ now | date "Monday, January 2, 2006" }

## Today's Focus
- [ ]

## Notes

---
Created: .action{ now | date "15:04" }
{: custom-dailynote-.action{ now | date "20060102" } }
\`\`\`

## Tips
- Use \`| int\` for type conversion
- Check empty with \`if not (empty $list)\`
- Escape special chars in strings
`;

const SEARCH_REFERENCE = `# SiYuan Advanced Search Patterns

## Search Strategy

### Composite Tools (Recommended)
1. \`getContentTree()\` - Overview of workspace
2. \`searchWithContext(query)\` - Find with context
3. \`getDocumentOutline(docId)\` - Explore specific doc

### SQL Queries (Complex Filters)
- Multi-keyword AND/OR logic
- Date range filtering
- Custom attribute filtering
- Cross-reference analysis

### Path Navigation (Known Location)
- \`getIDsByHPath("/path/to/doc", notebookId)\`
- Convert human paths to block IDs

## SQL Patterns

### Multi-Keyword Search
\`\`\`sql
-- AND logic (all required)
SELECT id, content FROM blocks
WHERE content LIKE '%keyword1%'
  AND content LIKE '%keyword2%' LIMIT 50;

-- OR logic (any match)
SELECT id, content FROM blocks
WHERE content LIKE '%Python%'
   OR content LIKE '%JavaScript%' LIMIT 50;
\`\`\`

### Recent Activity
\`\`\`sql
-- This week
SELECT id, content, updated FROM blocks
WHERE type = 'd'
  AND updated >= strftime('%Y%m%d', 'now', '-7 days') || '000000'
ORDER BY updated DESC LIMIT 20;
\`\`\`

### Find Related Content
\`\`\`sql
-- Documents that reference each other
SELECT DISTINCT b1.content, b2.content
FROM blocks b1
JOIN refs r ON b1.id = r.block_id
JOIN blocks b2 ON r.def_block_id = b2.id
WHERE b1.type = 'd' AND b2.type = 'd' LIMIT 20;
\`\`\`

## Performance Tips
1. Always use LIMIT
2. Filter by type first
3. Use indexed columns (type, id, box, updated)
4. Avoid LIKE on large datasets without other filters
5. Use date ranges to narrow results

## Quick Ref
\`\`\`sql
-- Today's changes
WHERE updated >= strftime('%Y%m%d', 'now') || '000000'

-- By notebook
WHERE box = 'notebook_id'

-- Uncompleted tasks
WHERE markdown LIKE '%- [ ]%'
\`\`\`
`;

/**
 * Register unified reference tool
 */
export function registerReferenceTools(server: McpServer): void {
  server.tool(
    'siyuan_getReference',
    'Get reference documentation and examples for SiYuan features. Choose a category to get SQL queries, charts, templates, or search patterns.',
    {
      category: z.enum(['sql', 'charts', 'templates', 'search']).describe('Type of reference to retrieve: sql, charts, templates, or search'),
    },
    { readOnlyHint: true, idempotentHint: true },
    async (args: { category: 'sql' | 'charts' | 'templates' | 'search' }) => {
      const { category } = args;

      // Return the appropriate content based on category
      let content: string;
      switch (category) {
        case 'sql':
          content = SQL_REFERENCE;
          break;
        case 'charts':
          content = CHARTS_REFERENCE;
          break;
        case 'templates':
          content = TEMPLATES_REFERENCE;
          break;
        case 'search':
          content = SEARCH_REFERENCE;
          break;
        default:
          throw new Error('Unknown category: ' + category);
      }

      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    }
  );
}
