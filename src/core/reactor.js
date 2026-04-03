/**
 * SavageReactor - Core Reactivity Engine
 * 
 * Implements Proxy-based reactive state management.
 * Automatically tracks dependencies and notifies subscribers when state changes.
 * 
 * Standards: ECMAScript 2025 (Proxy API)
 * Reference: https://ecma-international.org/publications-and-standards/standards/ecma-262/
 */

/**
 * Symbol for identifying reactive objects
 */
const REACTIVE_SYMBOL = Symbol('savage-reactive');

/**
 * Check if an object is already reactive
 * @param {*} obj 
 * @returns {boolean}
 */
export function isReactive(obj) {
  return obj && typeof obj === 'object' && obj[REACTIVE_SYMBOL] === true;
}

/**
 * SavageReactor Class
 * Manages reactive state with automatic dependency tracking
 */
export class SavageReactor {
  constructor(initialState = {}) {
    this.subscribers = new Map();
    this.effectStack = [];
    this.batchQueue = new Set();
    this.isBatching = false;
    
    // Create reactive proxy of state
    this.state = this._createReactiveProxy(initialState);
  }

  /**
   * Create a reactive proxy for an object
   * @param {Object} target 
   * @param {string} path - Dot-notation path for nested properties
   * @returns {Proxy}
   * @private
   */
  _createReactiveProxy(target, path = '') {
    if (!target || typeof target !== 'object') {
      return target;
    }

    // Don't wrap if already reactive
    if (isReactive(target)) {
      return target;
    }

    // Handle arrays
    if (Array.isArray(target)) {
      return this._createArrayProxy(target, path);
    }

    const self = this;
    const reactiveObj = {};

    // Mark as reactive
    Object.defineProperty(reactiveObj, REACTIVE_SYMBOL, {
      value: true,
      enumerable: false,
      writable: false
    });

    // Proxy all properties
    return new Proxy(reactiveObj, {
      get(obj, prop) {
        if (prop === REACTIVE_SYMBOL) return true;
        
        const fullPath = path ? `${path}.${String(prop)}` : String(prop);
        
        // Track dependency
        self._trackDependency(fullPath);
        
        // Return reactive version of value
        const value = target[prop];
        if (value && typeof value === 'object') {
          return self._createReactiveProxy(value, fullPath);
        }
        return value;
      },

      set(obj, prop, value) {
        const fullPath = path ? `${path}.${String(prop)}` : String(prop);
        const oldValue = target[prop];
        
        // Only update if value changed
        if (oldValue !== value) {
          target[prop] = value;
          self._notifyChange(fullPath);
        }
        
        return true;
      },

      deleteProperty(obj, prop) {
        const fullPath = path ? `${path}.${String(prop)}` : String(prop);
        
        if (prop in target) {
          delete target[prop];
          self._notifyChange(fullPath);
        }
        
        return true;
      }

    });
  }

  /**
   * Create reactive proxy for arrays
   * @param {Array} target 
   * @param {string} path 
   * @returns {Proxy}
   * @private
   */
  _createArrayProxy(target, path) {
    const self = this;
    
    return new Proxy(target, {
      get(arr, prop) {
        // Handle array methods that modify
        const mutatingMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
        
        if (mutatingMethods.includes(prop)) {
          return function(...args) {
            const result = arr[prop](...args);
            self._notifyChange(path || '*');
            return result;
          };
        }
        
        // Track access to entire array or specific indices
        const fullPath = path ? `${path}.${String(prop)}` : String(prop);
        self._trackDependency(path || '*');
        
        const value = arr[prop];
        if (value && typeof value === 'object') {
          return self._createReactiveProxy(value, fullPath);
        }
        return value;
      },

      set(arr, prop, value) {
        const oldValue = arr[prop];
        
        if (oldValue !== value) {
          arr[prop] = value;
          self._notifyChange(path || '*');
        }
        
        return true;
      }
    });
  }

  /**
   * Track a dependency for the current effect
   * @param {string} path 
   * @private
   */
  _trackDependency(path) {
    if (this.effectStack.length > 0) {
      const currentEffect = this.effectStack[this.effectStack.length - 1];
      
      if (!this.subscribers.has(path)) {
        this.subscribers.set(path, new Set());
      }
      this.subscribers.get(path).add(currentEffect);
    }
  }

  /**
   * Notify all subscribers of a path change
   * @param {string} path 
   * @private
   */
  _notifyChange(path) {
    if (this.isBatching) {
      this.batchQueue.add(path);
      return;
    }

    this._flushNotification(path);
  }

  /**
   * Flush a notification to subscribers
   * @param {string} path 
   * @private
   */
  _flushNotification(path) {
    const effects = this.subscribers.get(path);
    if (effects) {
      effects.forEach(effect => {
        try {
          effect();
        } catch (err) {
          console.error(`SavageReactor: Effect error for path "${path}":`, err);
        }
      });
    }

    // Also notify wildcard subscribers
    const parts = path.split('.');
    let currentPath = '';
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}.${part}` : part;
      const parentEffects = this.subscribers.get(currentPath + '.*');
      if (parentEffects) {
        parentEffects.forEach(effect => {
          try {
            effect();
          } catch (err) {
            console.error(`SavageReactor: Parent effect error:`, err);
          }
        });
      }
    }
  }

  /**
   * Execute a function with automatic dependency tracking
   * @param {Function} fn - Function to track
   * @param {Function} onUpdate - Called when dependencies change
   * @returns {Function} - Unsubscribe function
   */
  watch(fn, onUpdate) {
    const effect = () => {
      this.effectStack.push(onUpdate);
      try {
        fn();
      } finally {
        this.effectStack.pop();
      }
    };

    // Run immediately to collect dependencies
    effect();

    // Return unsubscribe function
    return () => {
      this.subscribers.forEach(effects => {
        effects.delete(onUpdate);
      });
    };
  }

  /**
   * Batch multiple state updates
   * @param {Function} fn 
   */
  batch(fn) {
    this.isBatching = true;
    
    try {
      fn();
    } finally {
      this.isBatching = false;
      
      // Flush all batched notifications
      const uniquePaths = Array.from(this.batchQueue);
      this.batchQueue.clear();
      
      // Use Set to deduplicate effects
      const effectsToRun = new Set();
      
      uniquePaths.forEach(path => {
        const effects = this.subscribers.get(path);
        if (effects) {
          effects.forEach(effect => effectsToRun.add(effect));
        }
      });
      
      // Run all effects
      effectsToRun.forEach(effect => {
        try {
          effect();
        } catch (err) {
          console.error('SavageReactor: Batched effect error:', err);
        }
      });
    }
  }

  /**
   * Set state (shallow merge)
   * @param {Object} newState 
   */
  setState(newState) {
    this.batch(() => {
      Object.keys(newState).forEach(key => {
        this.state[key] = newState[key];
      });
    });
  }

  /**
   * Get a snapshot of current state (non-reactive)
   * @returns {Object}
   */
  getState() {
    return this._deepClone(this.state);
  }

  /**
   * Deep clone an object (works with Proxy)
   * @param {Object} obj 
   * @returns {Object}
   * @private
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this._deepClone(item));
    }

    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this._deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Clean up all subscriptions
   */
  destroy() {
    this.subscribers.clear();
    this.effectStack = [];
    this.batchQueue.clear();
  }
}

export default SavageReactor;
