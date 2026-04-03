/**
 * Savage Router - Single Page Application Router
 * 
 * Standards-compliant client-side routing using History API.
 * 
 * Standards: HTML Living Standard (History API)
 * Reference: https://html.spec.whatwg.org/
 */

/**
 * Route matching utilities
 */
const RouteUtils = {
  /**
   * Convert route pattern to regex
   * @param {string} pattern 
   * @returns {RegExp}
   */
  patternToRegex(pattern) {
    // Escape special regex chars except : and *
    let regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/:([^/]+)/g, '([^/]+)');
    
    return new RegExp(`^${regex}$`);
  },

  /**
   * Extract params from path
   * @param {string} pattern 
   * @param {string} path 
   * @returns {Object|null}
   */
  extractParams(pattern, path) {
    // Handle wildcard - matches any path
    if (pattern === '*') {
      return {};
    }

    const paramNames = [];
    const regexPattern = pattern.replace(/:([^/]+)/g, (match, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${regexPattern}$`);
    const match = path.match(regex);

    if (!match) return null;

    const params = {};
    paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });

    return params;
  },

  /**
   * Check if path matches pattern
   * @param {string} pattern 
   * @param {string} path 
   * @returns {boolean}
   */
  matches(pattern, path) {
    const regex = this.patternToRegex(pattern);
    return regex.test(path);
  }
};

/**
 * SavageRouter Class
 */
export class SavageRouter {
  constructor(options = {}) {
    this.routes = new Map();
    this.currentRoute = null;
    this.beforeHooks = [];
    this.afterHooks = [];
    this.errorHandler = null;
    
    // Configuration
    this.config = {
      mode: options.mode || 'history', // 'history' or 'hash'
      base: options.base || '',
      linkActiveClass: options.linkActiveClass || 'active',
      scrollBehavior: options.scrollBehavior || null,
      fallback: options.fallback !== false // true for hash fallback
    };

    // Bind methods
    this.navigate = this.navigate.bind(this);
    this.back = this.back.bind(this);
    this.forward = this.forward.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
    this.handleClick = this.handleClick.bind(this);

    // Set up listeners
    this._setupListeners();
    
    // Disable browser auto-scrolling on history changes
    if (window.history.scrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }
  }

  /**
   * Set up event listeners
   * @private
   */
  _setupListeners() {
    // Handle browser back/forward
    window.addEventListener('popstate', this.handlePopState);
    
    // Handle link clicks for SPA navigation
    document.addEventListener('click', this.handleClick);
  }

  /**
   * Handle popstate events (back/forward buttons)
 * @param {PopStateEvent} event 
   * @private
   */
  handlePopState(event) {
    this._resolve(window.location.pathname + window.location.search);
    
    // Restore scroll position from history state
    if (event.state && event.state._scrollX !== undefined) {
      setTimeout(() => {
        window.scrollTo(event.state._scrollX, event.state._scrollY);
      }, 0);
    }
  }

  /**
   * Handle link clicks for SPA navigation
   * @param {MouseEvent} event 
   * @private
   */
  handleClick(event) {
    // Find closest anchor
    const link = event.target.closest('a');
    if (!link) return;

    // Skip if special click or external link
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      link.target ||
      link.hasAttribute('download') ||
      link.getAttribute('rel') === 'external' ||
      link.hostname !== window.location.hostname
    ) {
      return;
    }

    // Skip if hash-only link
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) return;

    // Navigate
    event.preventDefault();
    this.navigate(href || link.pathname);
  }

  /**
   * Register a route
   * @param {string} path - Route path pattern
   * @param {Object|Function} config - Route configuration
   * @returns {SavageRouter}
   */
  route(path, config) {
    if (typeof config === 'function') {
      config = { component: config };
    }

    this.routes.set(path, {
      path,
      ...config,
      regex: RouteUtils.patternToRegex(path)
    });

    return this;
  }

  /**
   * Register multiple routes
   * @param {Array<Object>} routes 
   * @returns {SavageRouter}
   */
  routes(routesArray) {
    routesArray.forEach(route => {
      this.route(route.path, route);
    });
    return this;
  }

  /**
   * Navigate to path
   * @param {string} path 
   * @param {Object} options 
   */
  navigate(path, options = {}) {
    const { replace = false, state = {} } = options;
    
    // Save current scroll position to state
    state._scrollX = window.scrollX || window.pageXOffset;
    state._scrollY = window.scrollY || window.pageYOffset;

    // Update history
    if (replace) {
      window.history.replaceState(state, '', path);
    } else {
      window.history.pushState(state, '', path);
    }

    // Resolve route
    this._resolve(path, state);
  }

  /**
   * Go back
   */
  back() {
    window.history.back();
  }

  /**
   * Go forward
   */
  forward() {
    window.history.forward();
  }

  /**
   * Go n steps
   * @param {number} n 
   */
  go(n) {
    window.history.go(n);
  }

  /**
   * Resolve route for path
   * @param {string} path 
   * @param {Object} state 
   * @private
   */
  async _resolve(path, state = {}) {
    // Find matching route
    const route = this._matchRoute(path);

    if (!route) {
      this._handleError(new Error(`No route found for ${path}`));
      return;
    }

    const to = {
      path: route.path,
      params: route.params,
      query: this._parseQuery(path),
      hash: window.location.hash,
      state
    };

    const from = this.currentRoute;

    // Run before hooks
    for (const hook of this.beforeHooks) {
      const result = await hook(to, from);
      if (result === false) {
        // Navigation cancelled
        return;
      }
    }

    // Update current route
    this.currentRoute = to;

    // Render component
    if (route.config.component) {
      this._renderComponent(route.config.component, to);
    }

    // Call after hooks
    this.afterHooks.forEach(hook => hook(to, from));

    // Update document title
    if (route.config.title) {
      document.title = route.config.title;
    }

    // Handle scroll behavior
    if (this.config.scrollBehavior) {
      this.config.scrollBehavior(to, from);
    } else {
      window.scrollTo(0, 0);
    }

    // Update active links
    this._updateActiveLinks();
  }

  /**
   * Match route for path
   * @param {string} path 
   * @returns {Object|null}
   * @private
   */
  _matchRoute(path) {
    const cleanPath = path.split('?')[0];

    for (const [pattern, config] of this.routes) {
      if (RouteUtils.matches(pattern, cleanPath)) {
        const params = RouteUtils.extractParams(pattern, cleanPath);
        return {
          config,
          params,
          pattern
        };
      }
    }

    return null;
  }

  /**
   * Parse query string
   * @param {string} path 
   * @returns {Object}
   * @private
   */
  _parseQuery(path) {
    const queryString = path.split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    const result = {};
    
    for (const [key, value] of params) {
      if (result[key]) {
        if (Array.isArray(result[key])) {
          result[key].push(value);
        } else {
          result[key] = [result[key], value];
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Render route component
   * @param {Function|Object} component 
   * @param {Object} route 
   * @private
   */
  _renderComponent(component, route) {
    // Find router outlet
    const outlet = document.querySelector('[data-router-outlet]') || 
                   document.querySelector('#router-outlet') ||
                   document.body;
    
    // Save current scroll position
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    if (typeof component === 'function') {
      // Check if component is a constructor (class) or a factory function
      const isConstructor = component.prototype && component.prototype.constructor === component;
      
      if (isConstructor) {
        // Component class
        const instance = new component({
          router: this,
          route,
          params: route.params,
          query: route.query
        });
        
        if (instance.mount) {
          outlet.innerHTML = '';
          instance.mount(outlet);
        } else {
          outlet.innerHTML = '';
          outlet.appendChild(instance);
        }
      } else {
        // Factory function - call it to get the element
        const element = component({
          router: this,
          route,
          params: route.params,
          query: route.query
        });
        
        outlet.innerHTML = '';
        if (element instanceof HTMLElement) {
          outlet.appendChild(element);
        } else if (typeof element === 'string') {
          outlet.innerHTML = element;
        }
      }
    } else if (typeof component === 'string') {
      // HTML template
      outlet.innerHTML = component;
    }
    
    // Restore scroll position to prevent jump
    window.scrollTo(scrollX, scrollY);
  }

  /**
   * Handle navigation error
   * @param {Error} error 
   * @private
   */
  _handleError(error) {
    if (this.errorHandler) {
      this.errorHandler(error);
    } else {
      console.error('Router error:', error);
    }
  }

  /**
   * Update active link classes
   * @private
   */
  _updateActiveLinks() {
    document.querySelectorAll('[data-router-link]').forEach(link => {
      const href = link.getAttribute('href');
      const isActive = this._isActive(href);
      
      if (isActive) {
        link.classList.add(this.config.linkActiveClass);
      } else {
        link.classList.remove(this.config.linkActiveClass);
      }
    });
  }

  /**
   * Check if link is active
   * @param {string} href 
   * @returns {boolean}
   * @private
   */
  _isActive(href) {
    const current = this.currentRoute?.path || window.location.pathname;
    return current === href || current.startsWith(href + '/');
  }

  /**
   * Add navigation guard (before)
   * @param {Function} fn 
   * @returns {Function} Remove function
   */
  beforeEach(fn) {
    this.beforeHooks.push(fn);
    return () => {
      const index = this.beforeHooks.indexOf(fn);
      if (index > -1) this.beforeHooks.splice(index, 1);
    };
  }

  /**
   * Add navigation hook (after)
   * @param {Function} fn 
   * @returns {Function} Remove function
   */
  afterEach(fn) {
    this.afterHooks.push(fn);
    return () => {
      const index = this.afterHooks.indexOf(fn);
      if (index > -1) this.afterHooks.splice(index, 1);
    };
  }

  /**
   * Set error handler
   * @param {Function} fn 
   */
  onError(fn) {
    this.errorHandler = fn;
  }

  /**
   * Initialize router
   */
  init() {
    this._resolve(window.location.pathname + window.location.search);
  }

  /**
   * Destroy router and clean up
   */
  destroy() {
    window.removeEventListener('popstate', this.handlePopState);
    document.removeEventListener('click', this.handleClick);
    this.routes.clear();
    this.beforeHooks = [];
    this.afterHooks = [];
  }

  /**
   * Generate URL for named route
   * @param {string} name 
   * @param {Object} params 
   * @returns {string|null}
   */
  resolve(name, params = {}) {
    // Find route by name
    for (const [path, config] of this.routes) {
      if (config.name === name) {
        // Replace params in path
        let url = path;
        Object.keys(params).forEach(key => {
          url = url.replace(`:${key}`, encodeURIComponent(params[key]));
        });
        return url;
      }
    }
    return null;
  }

  /**
   * Get current route info
   * @returns {Object|null}
   */
  current() {
    return this.currentRoute;
  }
}

/**
 * Create router instance
 * @param {Object} options 
 * @returns {SavageRouter}
 */
export function createRouter(options = {}) {
  return new SavageRouter(options);
}

export default SavageRouter;
