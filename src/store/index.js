/**
 * Savage Store - Global State Management
 * 
 * Centralized state management with actions, mutations, and getters.
 * Inspired by modern state management patterns.
 */

import { SavageReactor } from '../core/reactor.js';

/**
 * SavageStore Class
 * Centralized state container
 */
export class SavageStore {
  constructor(options = {}) {
    this.state = {};
    this.mutations = {};
    this.actions = {};
    this.getters = {};
    this.modules = {};
    this.plugins = [];
    this.strict = options.strict || false;
    this.committing = false;

    // Initialize reactor for reactivity
    this.reactor = new SavageReactor();

    // Initialize state
    if (options.state) {
      this.replaceState(options.state);
    }

    // Register mutations
    if (options.mutations) {
      Object.keys(options.mutations).forEach(key => {
        this.registerMutation(key, options.mutations[key]);
      });
    }

    // Register actions
    if (options.actions) {
      Object.keys(options.actions).forEach(key => {
        this.registerAction(key, options.actions[key]);
      });
    }

    // Register getters
    if (options.getters) {
      Object.keys(options.getters).forEach(key => {
        this.registerGetter(key, options.getters[key]);
      });
    }

    // Register modules
    if (options.modules) {
      Object.keys(options.modules).forEach(key => {
        this.registerModule(key, options.modules[key]);
      });
    }

    // Apply plugins
    if (options.plugins) {
      options.plugins.forEach(plugin => this.use(plugin));
    }
  }

  /**
   * Get current state
   * @returns {Object}
   */
  getState() {
    return this.reactor.getState();
  }

  /**
   * Replace entire state
   * @param {Object} newState 
   */
  replaceState(newState) {
    this.state = { ...newState };
    this.reactor.setState(this.state);
  }

  /**
   * Commit a mutation (synchronous state change)
   * @param {string} type - Mutation name
   * @param {any} payload - Data for mutation
   */
  commit(type, payload) {
    if (this.strict && !this.committing) {
      console.error('SavageStore: Use commit() only inside mutations');
      return;
    }

    const mutation = this.mutations[type];
    if (!mutation) {
      console.error(`SavageStore: Unknown mutation "${type}"`);
      return;
    }

    // Create state snapshot
    const state = this.getState();
    
    // Apply mutation
    mutation(state, payload);
    
    // Update reactive state
    this.reactor.setState(state);

    // Notify plugins
    this.plugins.forEach(plugin => {
      if (plugin.onMutation) {
        plugin.onMutation({ type, payload }, state);
      }
    });
  }

  /**
   * Dispatch an action (can be asynchronous)
   * @param {string} type - Action name
   * @param {any} payload - Data for action
   * @returns {Promise}
   */
  dispatch(type, payload) {
    const action = this.actions[type];
    if (!action) {
      console.error(`SavageStore: Unknown action "${type}"`);
      return Promise.reject(new Error(`Unknown action: ${type}`));
    }

    // Create context
    const context = {
      state: this.getState(),
      getters: this.getters,
      commit: this.commit.bind(this),
      dispatch: this.dispatch.bind(this)
    };

    // Execute action
    const result = action(context, payload);

    // Notify plugins
    this.plugins.forEach(plugin => {
      if (plugin.onAction) {
        plugin.onAction({ type, payload }, context);
      }
    });

    return Promise.resolve(result);
  }

  /**
   * Register a mutation
   * @param {string} name 
   * @param {Function} handler 
   */
  registerMutation(name, handler) {
    this.mutations[name] = handler;
  }

  /**
   * Register an action
   * @param {string} name 
   * @param {Function} handler 
   */
  registerAction(name, handler) {
    this.actions[name] = handler;
  }

  /**
   * Register a getter
   * @param {string} name 
   * @param {Function} handler 
   */
  registerGetter(name, handler) {
    Object.defineProperty(this.getters, name, {
      get: () => handler(this.getState(), this.getters),
      enumerable: true
    });
  }

  /**
   * Register a module
   * @param {string} name 
   * @param {Object} module 
   */
  registerModule(name, module) {
    // Create namespaced store for module
    const moduleStore = new SavageStore({
      state: module.state || {},
      mutations: module.mutations || {},
      actions: module.actions || {},
      getters: module.getters || {}
    });

    this.modules[name] = moduleStore;

    // Add module state to root state
    const state = this.getState();
    state[name] = moduleStore.getState();
    this.replaceState(state);
  }

  /**
   * Subscribe to state changes
   * @param {Function} fn 
   * @returns {Function} Unsubscribe
   */
  subscribe(fn) {
    return this.reactor.watch(
      () => this.getState(),
      (newState, oldState) => fn(newState, oldState)
    );
  }

  /**
   * Watch a specific path
   * @param {Function} getter 
   * @param {Function} callback 
   * @returns {Function} Unsubscribe
   */
  watch(getter, callback) {
    return this.reactor.watch(getter, callback);
  }

  /**
   * Use a plugin
   * @param {Function} plugin 
   */
  use(plugin) {
    if (typeof plugin === 'function') {
      const pluginInstance = plugin(this);
      if (pluginInstance) {
        this.plugins.push(pluginInstance);
      }
    } else if (plugin && typeof plugin === 'object') {
      this.plugins.push(plugin);
    }
    return this;
  }

  /**
   * Map state to component/computed
   * @param {Array<string>|Object} mappings 
   * @returns {Object}
   */
  mapState(mappings) {
    const result = {};

    if (Array.isArray(mappings)) {
      mappings.forEach(key => {
        result[key] = function() {
          return this.$store.getState()[key];
        };
      });
    } else {
      Object.keys(mappings).forEach(key => {
        const getter = mappings[key];
        if (typeof getter === 'string') {
          result[key] = function() {
            return this.$store.getState()[getter];
          };
        } else if (typeof getter === 'function') {
          result[key] = function() {
            return getter.call(this, this.$store.getState());
          };
        }
      });
    }

    return result;
  }

  /**
   * Map getters to component/computed
   * @param {Array<string>|Object} mappings 
   * @returns {Object}
   */
  mapGetters(mappings) {
    const result = {};

    if (Array.isArray(mappings)) {
      mappings.forEach(key => {
        result[key] = function() {
          return this.$store.getters[key];
        };
      });
    } else {
      Object.keys(mappings).forEach(key => {
        result[key] = function() {
          const getterName = mappings[key];
          return this.$store.getters[getterName];
        };
      });
    }

    return result;
  }

  /**
   * Map mutations to component/methods
   * @param {Array<string>|Object} mappings 
   * @returns {Object}
   */
  mapMutations(mappings) {
    const result = {};

    if (Array.isArray(mappings)) {
      mappings.forEach(key => {
        result[key] = function(payload) {
          this.$store.commit(key, payload);
        };
      });
    } else {
      Object.keys(mappings).forEach(key => {
        result[key] = function(payload) {
          const mutationName = mappings[key];
          this.$store.commit(mutationName, payload);
        };
      });
    }

    return result;
  }

  /**
   * Map actions to component/methods
   * @param {Array<string>|Object} mappings 
   * @returns {Object}
   */
  mapActions(mappings) {
    const result = {};

    if (Array.isArray(mappings)) {
      mappings.forEach(key => {
        result[key] = function(payload) {
          return this.$store.dispatch(key, payload);
        };
      });
    } else {
      Object.keys(mappings).forEach(key => {
        result[key] = function(payload) {
          const actionName = mappings[key];
          return this.$store.dispatch(actionName, payload);
        };
      });
    }

    return result;
  }
}

/**
 * Create store instance
 * @param {Object} options 
 * @returns {SavageStore}
 */
export function createStore(options = {}) {
  return new SavageStore(options);
}

/**
 * Logger plugin for development
 * @returns {Object}
 */
export function createLoggerPlugin() {
  return {
    onMutation(mutation, state) {
      console.group(`Mutation: ${mutation.type}`);
      console.log('Payload:', mutation.payload);
      console.log('State:', state);
      console.groupEnd();
    },
    onAction(action, context) {
      console.group(`Action: ${action.type}`);
      console.log('Payload:', action.payload);
      console.groupEnd();
    }
  };
}

/**
 * Persistence plugin for localStorage
 * @param {Object} options 
 * @returns {Object}
 */
export function createPersistencePlugin(options = {}) {
  const { key = 'savage-store', paths = [] } = options;

  return {
    store => {
      // Restore state
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const state = JSON.parse(saved);
          store.replaceState(state);
        } catch (err) {
          console.error('Failed to restore state:', err);
        }
      }

      // Subscribe to changes
      store.subscribe((newState) => {
        const toSave = paths.length > 0
          ? paths.reduce((acc, path) => {
              acc[path] = newState[path];
              return acc;
            }, {})
          : newState;
        
        localStorage.setItem(key, JSON.stringify(toSave));
      });
    }
  };
}

export default SavageStore;
