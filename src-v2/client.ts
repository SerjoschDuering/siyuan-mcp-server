/**
 * SiYuan API Client Singleton
 * Provides a configured axios instance for all SiYuan API requests
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';

/**
 * Singleton wrapper for SiYuan HTTP client
 */
class SiYuanClient {
  private static instance: SiYuanClient | null = null;
  private client: AxiosInstance;

  private constructor() {
    const apiUrl = process.env.SIYUAN_API_URL || 'http://localhost:6806';
    const token = process.env.SIYUAN_TOKEN;

    if (!token) {
      throw new Error(
        'SIYUAN_TOKEN environment variable is required. ' +
        'Find your token in SiYuan Settings → About.'
      );
    }

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'Authorization': `Token ${token}`,
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
            'Authentication failed. Please check your SIYUAN_TOKEN environment variable.'
          );
        }
        if (error.code === 'ECONNREFUSED') {
          throw new Error(
            `Cannot connect to SiYuan at ${apiUrl}. ` +
            'Make sure SiYuan is running and the API URL is correct.'
          );
        }
        throw error;
      }
    );
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): SiYuanClient {
    if (!SiYuanClient.instance) {
      SiYuanClient.instance = new SiYuanClient();
    }
    return SiYuanClient.instance;
  }

  /**
   * Get the axios client instance
   */
  public getClient(): AxiosInstance {
    return this.client;
  }

  /**
   * Post multipart form data
   * Used for file uploads that require multipart/form-data
   *
   * @param endpoint - API endpoint path
   * @param formData - FormData object containing the multipart data
   * @returns API response
   */
  public async postMultipart(endpoint: string, formData: FormData) {
    const token = process.env.SIYUAN_TOKEN;

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

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    SiYuanClient.instance = null;
  }
}

// Export the configured client
export const siyuanClient = SiYuanClient.getInstance().getClient();

// Export the client class for multipart operations
export const siyuanClientInstance = SiYuanClient.getInstance();
