import { apiRequest } from '../utils/apiClient';

/**
 * Axios-like API client wrapper
 * 
 * This provides an axios-compatible interface on top of our custom apiRequest function.
 * It's designed to work with existing code that expects an axios-like API.
 */
class ApiClient {
  /**
   * Make a GET request
   * @param {string} url - The URL path (relative to API base)
   * @param {Object} config - Request configuration
   * @param {Object} config.params - Query parameters
   * @param {Object} config.headers - Additional headers
   * @returns {Promise<{data: any}>} Response with data property for axios compatibility
   */
  async get(url, config = {}) {
    const { params, headers, ...options } = config;
    
    // Build query string from params
    let fullUrl = url;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, value);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const response = await apiRequest(fullUrl, {
      method: 'GET',
      headers,
      ...options
    });

    // Return in axios format
    return { data: response.data || response };
  }

  /**
   * Make a POST request
   * @param {string} url - The URL path (relative to API base)
   * @param {any} data - Request body data
   * @param {Object} config - Request configuration
   * @returns {Promise<{data: any}>} Response with data property for axios compatibility
   */
  async post(url, data, config = {}) {
    const { headers, ...options } = config;
    
    const response = await apiRequest(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers,
      ...options
    });

    return { data: response.data || response };
  }

  /**
   * Make a PUT request
   * @param {string} url - The URL path (relative to API base)
   * @param {any} data - Request body data
   * @param {Object} config - Request configuration
   * @returns {Promise<{data: any}>} Response with data property for axios compatibility
   */
  async put(url, data, config = {}) {
    const { headers, ...options } = config;
    
    const response = await apiRequest(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers,
      ...options
    });

    return { data: response.data || response };
  }

  /**
   * Make a PATCH request
   * @param {string} url - The URL path (relative to API base)
   * @param {any} data - Request body data
   * @param {Object} config - Request configuration
   * @returns {Promise<{data: any}>} Response with data property for axios compatibility
   */
  async patch(url, data, config = {}) {
    const { headers, ...options } = config;
    
    const response = await apiRequest(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers,
      ...options
    });

    return { data: response.data || response };
  }

  /**
   * Make a DELETE request
   * @param {string} url - The URL path (relative to API base)
   * @param {Object} config - Request configuration
   * @returns {Promise<{data: any}>} Response with data property for axios compatibility
   */
  async delete(url, config = {}) {
    const { headers, ...options } = config;
    
    const response = await apiRequest(url, {
      method: 'DELETE',
      headers,
      ...options
    });

    return { data: response.data || response };
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;