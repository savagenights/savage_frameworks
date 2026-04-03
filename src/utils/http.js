/**
 * Savage HTTP - HTTP Request Utilities
 * 
 * Standards-compliant fetch wrapper with interceptors,
 * automatic JSON handling, and error management.
 * 
 * Standards: Fetch Living Standard
 * Reference: https://fetch.spec.whatwg.org/
 */

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  baseURL: '',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000,
  retries: 0,
  retryDelay: 1000
};

/**
 * Global interceptors
 */
const interceptors = {
  request: [],
  response: [],
  error: []
};

/**
 * HTTP Client Class
 */
export class SavageHttp {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Merge headers
   * @param {Object} additionalHeaders 
   * @returns {Object}
   * @private
   */
  _mergeHeaders(additionalHeaders = {}) {
    return {
      ...this.config.headers,
      ...additionalHeaders
    };
  }

  /**
   * Build full URL
   * @param {string} endpoint 
   * @returns {string}
   * @private
   */
  _buildURL(endpoint) {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    return `${this.config.baseURL}${endpoint}`;
  }

  /**
   * Apply request interceptors
   * @param {Object} config 
   * @returns {Object}
   * @private
   */
  _applyRequestInterceptors(config) {
    return interceptors.request.reduce(
      (acc, interceptor) => interceptor(acc),
      config
    );
  }

  /**
   * Apply response interceptors
   * @param {Response} response 
   * @returns {Response}
   * @private
   */
  _applyResponseInterceptors(response) {
    return interceptors.response.reduce(
      (acc, interceptor) => interceptor(acc),
      response
    );
  }

  /**
   * Apply error interceptors
   * @param {Error} error 
   * @returns {Error}
   * @private
   */
  _applyErrorInterceptors(error) {
    return interceptors.error.reduce(
      (acc, interceptor) => interceptor(acc),
      error
    );
  }

  /**
   * Execute request with timeout and retries
   * @param {string} method 
   * @param {string} endpoint 
   * @param {Object} options 
   * @returns {Promise}
   * @private
   */
  async _request(method, endpoint, options = {}) {
    const url = this._buildURL(endpoint);
    
    let config = {
      method,
      headers: this._mergeHeaders(options.headers),
      ...options
    };

    // Apply request interceptors
    config = this._applyRequestInterceptors(config);

    // Handle body for non-GET requests
    if (options.body && method !== 'GET') {
      if (typeof options.body === 'object' && !(options.body instanceof FormData)) {
        config.body = JSON.stringify(options.body);
      } else {
        config.body = options.body;
      }
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    config.signal = controller.signal;

    let lastError;
    const maxRetries = options.retries ?? this.config.retries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        // Apply response interceptors
        return this._applyResponseInterceptors(response);
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;

        // Don't retry on abort or if last attempt
        if (error.name === 'AbortError' || attempt === maxRetries) {
          throw this._applyErrorInterceptors(error);
        }

        // Wait before retry
        await this._delay(this.config.retryDelay * (attempt + 1));
      }
    }

    throw this._applyErrorInterceptors(lastError);
  }

  /**
   * Delay helper
   * @param {number} ms 
   * @returns {Promise}
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET request
   * @param {string} endpoint 
   * @param {Object} options 
   * @returns {Promise<Response>}
   */
  get(endpoint, options = {}) {
    return this._request('GET', endpoint, options);
  }

  /**
   * POST request
   * @param {string} endpoint 
   * @param {Object} body 
   * @param {Object} options 
   * @returns {Promise<Response>}
   */
  post(endpoint, body, options = {}) {
    return this._request('POST', endpoint, { ...options, body });
  }

  /**
   * PUT request
   * @param {string} endpoint 
   * @param {Object} body 
   * @param {Object} options 
   * @returns {Promise<Response>}
   */
  put(endpoint, body, options = {}) {
    return this._request('PUT', endpoint, { ...options, body });
  }

  /**
   * PATCH request
   * @param {string} endpoint 
   * @param {Object} body 
   * @param {Object} options 
   * @returns {Promise<Response>}
   */
  patch(endpoint, body, options = {}) {
    return this._request('PATCH', endpoint, { ...options, body });
  }

  /**
   * DELETE request
   * @param {string} endpoint 
   * @param {Object} options 
   * @returns {Promise<Response>}
   */
  delete(endpoint, options = {}) {
    return this._request('DELETE', endpoint, options);
  }

  /**
   * Add request interceptor
   * @param {Function} fn 
   */
  static addRequestInterceptor(fn) {
    interceptors.request.push(fn);
  }

  /**
   * Add response interceptor
   * @param {Function} fn 
   */
  static addResponseInterceptor(fn) {
    interceptors.response.push(fn);
  }

  /**
   * Add error interceptor
   * @param {Function} fn 
   */
  static addErrorInterceptor(fn) {
    interceptors.error.push(fn);
  }
}

/**
 * Response helpers
 */
export const ResponseUtils = {
  /**
   * Parse JSON response
   * @param {Response} response 
   * @returns {Promise<Object>}
   */
  async json(response) {
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.response = response;
      error.status = response.status;
      throw error;
    }
    return response.json();
  },

  /**
   * Parse text response
   * @param {Response} response 
   * @returns {Promise<string>}
   */
  async text(response) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.text();
  },

  /**
   * Parse blob response
   * @param {Response} response 
   * @returns {Promise<Blob>}
   */
  async blob(response) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.blob();
  }
};

/**
 * Create HTTP client instance
 * @param {Object} config 
 * @returns {SavageHttp}
 */
export function createHttpClient(config = {}) {
  return new SavageHttp(config);
}

/**
 * Default HTTP client instance
 */
export const http = new SavageHttp();

export default SavageHttp;
