/**
 * SiYuan API Client
 * Provides a configured axios instance for SiYuan API requests
 *
 * SECURITY MODEL:
 * - Token MUST come from client headers (X-SiYuan-Token)
 * - API URL MUST come from client headers (X-SiYuan-URL)
 * - Server MUST NOT store tokens or API URLs (multi-tenant support)
 * - Each request uses AsyncLocalStorage to thread credentials through
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';

/**
 * Request context containing SiYuan credentials
 */
export interface SiYuanContext {
  token: string;
  apiUrl: string;
}

/**
 * AsyncLocalStorage for threading SiYuan context through requests
 */
export const tokenStorage = new AsyncLocalStorage<SiYuanContext>();

/**
 * SiYuan HTTP Client
 * Token and API URL come from AsyncLocalStorage per request (multi-tenant)
 */
class SiYuanClient {
  private defaultApiUrl: string;

  constructor() {
    // Optional fallback for local development (stdio transport)
    this.defaultApiUrl = process.env.SIYUAN_API_URL || 'http://localhost:6806';
  }

  /**
   * Get current request context from AsyncLocalStorage
   */
  private getContext(): SiYuanContext {
    const context = tokenStorage.getStore();
    if (!context) {
      throw new Error(
        'No SiYuan context available. ' +
        'Client must send X-SiYuan-Token and X-SiYuan-URL headers with each request.'
      );
    }
    return context;
  }

  /**
   * Create axios client for current request context
   * @param timeout - Optional timeout in milliseconds (default: 30000ms)
   */
  private getClient(timeout: number = 30000): AxiosInstance {
    const context = this.getContext();

    const client = axios.create({
      baseURL: context.apiUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout // Configurable timeout per operation
    });

    // Response interceptor for error handling
    client.interceptors.response.use(
      (response) => {
        // Check SiYuan API response code
        if (response.data?.code !== 0) {
          throw new Error(
            response.data?.msg || `SiYuan API error: code ${response.data?.code}`
          );
        }
        return response;
      },
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          throw new Error(
            'Authentication failed. Invalid SiYuan token. ' +
            'Please check your X-SiYuan-Token header.'
          );
        }
        if (error.code === 'ECONNREFUSED') {
          throw new Error(
            `Cannot connect to SiYuan at ${context.apiUrl}. ` +
            'Make sure SiYuan is running and the API URL is correct.'
          );
        }
        throw error;
      }
    );

    return client;
  }

  /**
   * POST request to SiYuan API
   * Token and URL automatically injected from AsyncLocalStorage
   *
   * @param endpoint - API endpoint path (e.g., '/api/notebook/lsNotebooks')
   * @param data - Request body data
   * @param options - Optional request options (timeout override)
   * @returns API response
   */
  public async post(endpoint: string, data: any, options?: { timeout?: number }) {
    const context = this.getContext();
    const client = this.getClient(options?.timeout);

    return client.post(endpoint, data, {
      headers: {
        'Authorization': `Token ${context.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * POST multipart form data to SiYuan API
   * Used for file uploads that require multipart/form-data
   * Token and URL automatically injected from AsyncLocalStorage
   *
   * @param endpoint - API endpoint path
   * @param formData - FormData object containing the multipart data
   * @param options - Optional request options (timeout override)
   * @returns API response
   */
  public async postMultipart(endpoint: string, formData: FormData, options?: { timeout?: number }) {
    const context = this.getContext();
    const client = this.getClient(options?.timeout);

    // Get form headers (includes boundary)
    const formHeaders = formData.getHeaders ? formData.getHeaders() : {};

    return client.post(endpoint, formData, {
      headers: {
        ...formHeaders,
        'Authorization': `Token ${context.token}`,
      },
      // Important for file uploads
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }
}

// Export a single client instance (not singleton - token comes from AsyncLocalStorage)
const clientInstance = new SiYuanClient();

// Export the client instance with token-aware methods
export const siyuanClient = clientInstance;

// Export for backward compatibility
export const siyuanClientInstance = clientInstance;
