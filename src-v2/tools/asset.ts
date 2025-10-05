/**
 * Asset Tools Module
 *
 * Provides atomic MCP tools for SiYuan asset upload operations.
 * All tools map 1:1 with SiYuan API endpoints from /api/asset/*
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { siyuanClientInstance } from '../client.js';
import { createMultipartForm, validateFile, type UploadFile } from '../utils/multipart.js';

/**
 * Register all asset-related tools with the MCP server
 * @param server - The MCP server instance
 */
export function registerAssetTools(server: McpServer) {
  /**
   * Tool: siyuan_uploadAsset
   * Upload assets (images, files) to SiYuan workspace
   * API: /api/asset/upload
   */
  server.tool(
    'siyuan_uploadAsset',
    `Upload one or more files to SiYuan's assets directory. Files are automatically renamed with timestamps.

Examples:
- Upload image: { filename: "logo.png", data: "base64..." }
- Upload to subfolder: { filename: "logo.png", data: "base64...", assetsDirPath: "/assets/images/" }

The returned path (e.g., "assets/logo-20210719092549-9j5y79r.png") can be used in markdown as:
![Description](assets/logo-20210719092549-9j5y79r.png)`,
    {
      files: z.array(z.object({
        filename: z.string().describe('Original filename (e.g., "image.png")'),
        data: z.string().describe('Base64 encoded file data'),
        mimeType: z.string().optional().describe('MIME type (e.g., "image/png"). Auto-detected if not provided')
      })).min(1).max(10).describe('Files to upload (1-10 files per request)'),
      assetsDirPath: z.string()
        .optional()
        .default('/assets/')
        .describe('Target directory path (default: "/assets/"). Use "/assets/sub/" for subdirectories')
    },
    // Note: Not idempotent - each upload creates new files with unique timestamps
    {},
    async ({ files, assetsDirPath = '/assets/' }, _extra) => {
      // Validate files
      const uploadFiles: UploadFile[] = files;
      for (const file of uploadFiles) {
        const error = validateFile(file);
        if (error) {
          throw new Error(`File validation failed for ${file.filename}: ${error}`);
        }
      }

      // Create multipart form
      const formData = createMultipartForm(uploadFiles, assetsDirPath);

      try {
        // Upload using multipart
        const response = await siyuanClientInstance.postMultipart('/api/asset/upload', formData);

        const result = response.data.data;
        const errFiles = result.errFiles || [];
        const succMap = result.succMap || {};

        // Format response
        const successCount = Object.keys(succMap).length;
        const errorCount = errFiles.filter((f: string) => f).length;

        let message = `Upload complete: ${successCount} succeeded`;
        if (errorCount > 0) {
          message += `, ${errorCount} failed`;
        }

        // Build detailed response
        const details: string[] = [];

        if (successCount > 0) {
          details.push('\nSuccessfully uploaded:');
          for (const [original, uploaded] of Object.entries(succMap)) {
            details.push(`  • ${original} → ${uploaded}`);
            details.push(`    Use in markdown: ![](${uploaded})`);
          }
        }

        if (errorCount > 0) {
          details.push('\nFailed uploads:');
          errFiles.forEach((file: string) => {
            if (file) details.push(`  • ${file}`);
          });
        }

        return {
          content: [{
            type: 'text',
            text: message + details.join('\n')
          }],
          _meta: result
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Asset upload failed: ${errorMsg}`);
      }
    }
  );
}
