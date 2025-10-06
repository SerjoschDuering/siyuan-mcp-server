/**
 * SiYuan API Client
 * Provides a configured axios instance for SiYuan API requests
 *
 * SECURITY MODEL:
 * - Token MUST come from client headers (X-SiYuan-Token)
 * - Server MUST NOT store tokens in environment variables
 * - Each request uses AsyncLocalStorage to thread token through
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';

/**
 * AsyncLocalStorage for threading SiYuan token through requests
 */
export const tokenStorage = new AsyncLocalStorage<string>();

/**
 * SiYuan HTTP Client
 * No longer a singleton - token comes from AsyncLocalStorage per request
 */
class SiYuanClient {
  private client: AxiosInstance;
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.SIYUAN_API_URL || 'http://localhost:6806';

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
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
            `Cannot connect to SiYuan at ${this.apiUrl}. ` +
            'Make sure SiYuan is running and the API URL is correct.'
          );
        }
        throw error;
      }
    );
  }

  /**
   * Get current request token from AsyncLocalStorage
   */
  private getToken(): string {
    const token = tokenStorage.getStore();
    if (!token) {
      throw new Error(
        'No SiYuan token available. ' +
        'Client must send X-SiYuan-Token header with each request.'
      );
    }
    return token;
  }

  /**
   * Get the axios client instance
   */
  public getClient(): AxiosInstance {
    return this.client;
  }

  /**
   * POST request to SiYuan API
   * Token automatically injected from AsyncLocalStorage
   *
   * @param endpoint - API endpoint path (e.g., '/api/notebook/lsNotebooks')
   * @param data - Request body data
   * @returns API response
   */
  public async post(endpoint: string, data: any) {
    const token = this.getToken();

    return this.client.post(endpoint, data, {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * POST multipart form data to SiYuan API
   * Used for file uploads that require multipart/form-data
   * Token automatically injected from AsyncLocalStorage
   *
   * @param endpoint - API endpoint path
   * @param formData - FormData object containing the multipart data
   * @returns API response
   */
  public async postMultipart(endpoint: string, formData: FormData) {
    const token = this.getToken();

    // Get form headers (includes boundary)
    const formHeaders = formData.getHeaders ? formData.getHeaders() : {};

    return this.client.post(endpoint, formData, {
      headers: {
        ...formHeaders,
        'Authorization': `Token ${token}`,
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
