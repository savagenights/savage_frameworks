/**
 * SavageApp - Application Manager
 * 
 * Main application class for Savage Frameworks.
 * Manages component registration, mounting, and global state.
 * 
 * Standards: DOM Living Standard
 * Reference: https://dom.spec.whatwg.org/
 */

import { SavageComponent } from './component.js';
import { SavageReactor } from './reactor.js';
import { VERSION, getVersion } from './version.js';

/**
 * Global registry for component definitions
 */
const componentRegistry = new Map();

/**
 * SavageApp Class
 * Main application controller
 */
export class SavageApp {
  /**
   * @param {Object} options - Application options
   * @param {Object} options.globalState - Global shared state
   * @param {HTMLElement} options.root - Root element for the app
   */
  constructor(options = {}) {
    this.name = options.name || 'SavageApp';
    this.version = VERSION;
    
    // Global state reactor
    this.globalState = new SavageReactor(options.globalState || {});
    
    // Component instances
    this.components = new Map();
    this.mountedComponents = new Map();
    
    // Root element
    this.root = options.root || document.body;
    
    // Event delegation root
    this.eventListeners = [];
    
    // Plugins
    this.plugins = [];
    
    // Configuration
    this.config = {
      debug: options.debug || false,
      strictMode: options.strictMode || false,
      autoMount: options.autoMount !== false,
      ...options.config
    };

    // Bind methods
    this._bindMethods();
    
    // Auto-mount if enabled
    if (this.config.autoMount && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.mountAll());
    } else if (this.config.autoMount) {
      this.mountAll();
    }
  }

  /**
   * Bind methods to instance
   * @private
   */
  _bindMethods() {
    this.create = this.create.bind(this);
    this.component = this.component.bind(this);
    this.mount = this.mount.bind(this);
    this.unmount = this.unmount.bind(this);
  }

  /**
   * Register a global plugin
   * @param {Object} plugin 
   */
  use(plugin) {
    if (typeof plugin.install === 'function') {
      plugin.install(this);
      this.plugins.push(plugin);
      
      if (this.config.debug) {
        console.log(`SavageApp: Plugin "${plugin.name || 'anonymous'}" installed`);
      }
    } else {
      console.warn('SavageApp: Plugin must have an install method');
    }
    
    return this;
  }

  /**
   * Register a component definition
   * @param {string} name - Component name
   * @param {Object|Function} definition - Component options or class
   * @returns {SavageApp}
   */
  component(name, definition) {
    if (typeof name !== 'string' || !name) {
      throw new Error('Component name must be a non-empty string');
    }

    // Normalize definition
    const normalizedDef = typeof definition === 'function' 
      ? { class: definition }
      : { ...definition, name };

    componentRegistry.set(name, normalizedDef);
    
    if (this.config.debug) {
      console.log(`SavageApp: Component "${name}" registered`);
    }
    
    return this;
  }

  /**
   * Create a component instance (shorthand for HTML-first API)
   * @param {string} name - Component name
   * @param {Object} options - Component options
   * @returns {SavageComponent}
   */
  create(name, options = {}) {
    // Merge with registered definition if exists
    const registeredDef = componentRegistry.get(name);
    const mergedOptions = registeredDef 
      ? { ...registeredDef, ...options, name }
      : { ...options, name };

    // Create instance
    const instance = new SavageComponent(mergedOptions);
    
    // Store reference
    this.components.set(name, instance);
    
    return instance;
  }

  /**
   * Mount a component to an element
   * @param {string|HTMLElement} target - Selector or element
   * @param {string|SavageComponent} component - Component name or instance
   * @param {Object} props - Props to pass to component
   * @param {boolean} declarative - Whether to preserve existing HTML (declarative mode)
   * @returns {SavageComponent}
   */
  mount(target, component, props = {}, declarative = false) {
    const targetElement = typeof target === 'string'
      ? document.querySelector(target)
      : target;

    if (!targetElement) {
      console.warn(`SavageApp: Mount target not found: ${target}`);
      return null;
    }

    let instance;

    if (typeof component === 'string') {
      // Get from registry
      const definition = componentRegistry.get(component);
      if (!definition) {
        console.warn(`SavageApp: Component "${component}" not found in registry`);
        return null;
      }
      
      // For declarative mounting, use the existing HTML as template
      if (declarative) {
        const existingHTML = targetElement.innerHTML;
        instance = new SavageComponent({ ...definition, props, template: existingHTML });
      } else {
        instance = new SavageComponent({ ...definition, props });
      }
    } else if (component instanceof SavageComponent) {
      instance = component;
    } else {
      // Assume options object
      instance = new SavageComponent(component);
    }

    // Mount
    instance.mount(targetElement, declarative);
    
    // Track
    this.mountedComponents.set(targetElement, instance);
    
    if (this.config.debug) {
      console.log(`SavageApp: Component mounted to`, targetElement);
    }
    
    return instance;
  }

  /**
   * Unmount a component from an element
   * @param {string|HTMLElement} target 
   */
  unmount(target) {
    const targetElement = typeof target === 'string'
      ? document.querySelector(target)
      : target;

    if (!targetElement) return;

    const instance = this.mountedComponents.get(targetElement);
    if (instance) {
      instance.unmount();
      this.mountedComponents.delete(targetElement);
      
      if (this.config.debug) {
        console.log(`SavageApp: Component unmounted from`, targetElement);
      }
    }
  }

  /**
   * Mount all declarative components (data-savage attributes)
   */
  mountAll() {
    const elements = document.querySelectorAll('[data-savage]');
    
    elements.forEach(el => {
      const componentName = el.getAttribute('data-savage');
      const props = this._parseProps(el);
      
      if (componentRegistry.has(componentName)) {
        this.mount(el, componentName, props, true); // true = declarative mode
      } else {
        console.warn(`SavageApp: Declarative component "${componentName}" not registered`);
      }
    });
    
    if (this.config.debug) {
      console.log(`SavageApp: Mounted ${elements.length} declarative components`);
    }
  }

  /**
   * Parse props from data attributes
   * @param {HTMLElement} el 
   * @returns {Object}
   * @private
   */
  _parseProps(el) {
    const props = {};
    const attrs = el.attributes;
    
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      if (attr.name.startsWith('data-prop-')) {
        const propName = attr.name.replace('data-prop-', '');
        let value = attr.value;
        
        // Try to parse as JSON
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string
        }
        
        props[propName] = value;
      }
    }
    
    return props;
  }

  /**
   * Set global state
   * @param {Object} newState 
   */
  setGlobalState(newState) {
    this.globalState.setState(newState);
  }

  /**
   * Get global state
   * @returns {Object}
   */
  getGlobalState() {
    return this.globalState.getState();
  }

  /**
   * Watch global state changes
   * @param {Function} callback 
   * @returns {Function} - Unsubscribe
   */
  watchGlobal(callback) {
    return this.globalState.watch(
      () => this.globalState.getState(),
      callback
    );
  }

  /**
   * Get all registered component names
   * @returns {Array<string>}
   */
  getRegisteredComponents() {
    return Array.from(componentRegistry.keys());
  }

  /**
   * Get all mounted component instances
   * @returns {Map}
   */
  getMountedComponents() {
    return new Map(this.mountedComponents);
  }

  /**
   * Destroy the application and all components
   */
  destroy() {
    // Destroy all mounted components
    this.mountedComponents.forEach(instance => {
      instance.destroy();
    });
    this.mountedComponents.clear();
    
    // Clean up global state
    this.globalState.destroy();
    
    // Remove event listeners
    this.eventListeners.forEach(({ el, type, handler }) => {
      el.removeEventListener(type, handler);
    });
    this.eventListeners = [];
    
    if (this.config.debug) {
      console.log('SavageApp: Application destroyed');
    }
  }

  /**
   * Get framework version information
   * @returns {Object}
   */
  static getVersion() {
    return getVersion();
  }

  /**
   * Check if running in browser environment
   * @returns {boolean}
   */
  static isBrowser() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }
}

/**
 * Create a new SavageApp instance (factory function)
 * @param {Object} options 
 * @returns {SavageApp}
 */
export function createApp(options = {}) {
  return new SavageApp(options);
}

export default SavageApp;
