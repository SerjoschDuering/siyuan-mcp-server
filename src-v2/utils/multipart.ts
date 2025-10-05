/**
 * Multipart Form Data Utilities
 *
 * Converts base64 data to multipart form for SiYuan asset upload
 */

import FormData from 'form-data';
import { Buffer } from 'buffer';

/**
 * File upload parameters
 */
export interface UploadFile {
  filename: string;
  data: string;  // base64 encoded
  mimeType?: string;
}

/**
 * Convert base64 file data to FormData for multipart upload
 *
 * @param files - Array of files with base64 data
 * @param assetsDirPath - Target directory path (default: "/assets/")
 * @returns FormData ready for multipart upload
 */
export function createMultipartForm(
  files: UploadFile[],
  assetsDirPath: string = '/assets/'
): FormData {
  const form = new FormData();

  // Add the assets directory path
  form.append('assetsDirPath', assetsDirPath);

  // Process each file
  files.forEach((file) => {
    // Decode base64 to buffer
    const buffer = Buffer.from(file.data, 'base64');

    // Append as file with proper options
    form.append('file[]', buffer, {
      filename: file.filename,
      contentType: file.mimeType || getMimeType(file.filename)
    });
  });

  return form;
}

/**
 * Simple MIME type detection based on file extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    // Images
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',

    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    // Text
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',

    // Archives
    'zip': 'application/zip',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',

    // Default
    'default': 'application/octet-stream'
  };

  return mimeTypes[ext || 'default'] || mimeTypes.default;
}

/**
 * Validate file for upload
 *
 * @param file - File to validate
 * @returns Error message if invalid, null if valid
 */
export function validateFile(file: UploadFile): string | null {
  // Check filename
  if (!file.filename || file.filename.trim() === '') {
    return 'Filename is required';
  }

  // Check for path traversal attempts
  if (file.filename.includes('../') || file.filename.includes('..\\')) {
    return 'Invalid filename: path traversal detected';
  }

  // Check data
  if (!file.data) {
    return 'File data is required';
  }

  // Validate base64
  try {
    Buffer.from(file.data, 'base64');
  } catch (error) {
    return 'Invalid base64 data';
  }

  // Check size (optional - SiYuan may have its own limits)
  const buffer = Buffer.from(file.data, 'base64');
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (buffer.length > maxSize) {
    return `File too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: 100MB)`;
  }

  return null;
}

/**
 * Extract filename from asset path returned by SiYuan
 *
 * Example: "assets/foo-20210719092549-9j5y79r.png" → "foo-20210719092549-9j5y79r.png"
 */
export function extractAssetFilename(assetPath: string): string {
  const parts = assetPath.split('/');
  return parts[parts.length - 1];
}