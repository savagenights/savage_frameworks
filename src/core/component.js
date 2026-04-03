/**
 * SavageComponent - Base Component Class
 * 
 * The foundation for all Savage Framework components.
 * Manages state, lifecycle, rendering, and DOM bindings.
 * 
 * Standards: DOM Living Standard, HTML Living Standard
 * Reference: https://dom.spec.whatwg.org/, https://html.spec.whatwg.org/
 */

import { SavageReactor } from './reactor.js';
import { SavageBinder } from './binder.js';
import { VERSION } from './version.js';

/**
 * Lifecycle hooks available to components
 */
const LIFECYCLE_HOOKS = [
  'onCreated',
  'onMounted',
  'onUpdated',
  'onBeforeUnmount',
  'onUnmounted'
];

/**
 * SavageComponent Class
 * Base class for all Savage Framework components
 */
export class SavageComponent {
  /**
   * @param {Object} options - Component configuration
   * @param {string} options.name - Component name/identifier
   * @param {string|Function} options.template - HTML template
   * @param {Object} options.state - Initial state
   * @param {Object} options.props - Component properties
   * @param {Object} options.actions - State action functions
   * @param {Object} options.computed - Computed property definitions
   * @param {Object} options.hooks - Lifecycle hooks
   */
  constructor(options = {}) {
    console.log('Component: Creating with options:', Object.keys(options));
    console.log('Component: Actions in options:', Object.keys(options.actions || {}));
    
    // Core properties
    this.name = options.name || 'anonymous';
    this.version = VERSION;
    
    // Template
    this.template = options.template || '<div></div>';
    
    // Props (immutable inputs)
    this.props = { ...options.props };
    
    // Actions (state transformation functions)
    this.actions = options.actions || {};
    
    // Computed properties
    this.computed = options.computed || {};
    this._computedCache = new Map();
    
    // Lifecycle hooks
    this.hooks = {};
    LIFECYCLE_HOOKS.forEach(hook => {
      if (typeof options[hook] === 'function') {
        this.hooks[hook] = options[hook].bind(this);
      }
    });

    // DOM references
    this.element = null;
    this.isMounted = false;
    this.isDestroyed = false;

    // Initialize reactive system
    const initialState = this._initializeState(options.state);
    this.reactor = new SavageReactor(initialState);
    this.binder = new SavageBinder(this.reactor, this);

    // Bind methods
    this._bindMethods();

    // Call created hook
    this._invokeHook('onCreated');
  }

  /**
   * Initialize and validate state
   * @param {Object} state 
   * @returns {Object}
   * @private
   */
  _initializeState(state = {}) {
    // Deep clone to avoid reference issues
    return JSON.parse(JSON.stringify(state));
  }

  /**
   * Bind action methods to component context
   * @private
   */
  _bindMethods() {
    // Bind all action functions to this component
    Object.keys(this.actions).forEach(key => {
      const action = this.actions[key];
      if (typeof action === 'function') {
        this.actions[key] = action.bind(this);
      }
    });
  }

  /**
   * Render the component template
   * @returns {HTMLElement}
   * @private
   */
  _render() {
    // Process template
    let templateString = typeof this.template === 'function' 
      ? this.template(this.reactor.state, this.props)
      : this.template;

    // Replace {{ }} interpolations
    templateString = this._processInterpolations(templateString);

    // Create element from template
    const wrapper = document.createElement('div');
    wrapper.innerHTML = templateString.trim();
    
    // Return single element or first child
    const element = wrapper.children.length === 1 
      ? wrapper.firstElementChild 
      : wrapper;

    return element;
  }

  /**
   * Process {{ }} template interpolations
   * @param {string} template 
   * @returns {string}
   * @private
   */
  _processInterpolations(template) {
    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
      try {
        const value = this._evaluateInContext(expression.trim());
        return value != null ? String(value) : '';
      } catch (err) {
        console.warn(`SavageComponent: Error evaluating "${expression}":`, err);
        return '';
      }
    });
  }

  /**
   * Evaluate expression in component context
   * @param {string} expression 
   * @returns {any}
   * @private
   */
  _evaluateInContext(expression) {
    const state = this.reactor.getState();
    const props = this.props;
    
    // Create context with state and props
    const context = { ...state, ...props, $state: state, $props: props };
    
    // Use Function constructor for safe evaluation
    const keys = Object.keys(context);
    const values = Object.values(context);
    
    const fn = new Function(...keys, `return (${expression})`);
    return fn(...values);
  }

  /**
   * Invoke a lifecycle hook
   * @param {string} hookName 
   * @param {...any} args 
   * @private
   */
  _invokeHook(hookName, ...args) {
    const hook = this.hooks[hookName];
    if (typeof hook === 'function') {
      try {
        return hook(...args);
      } catch (err) {
        console.error(`SavageComponent: Error in ${hookName}:`, err);
      }
    }
  }

  /**
   * Get a computed property value
   * @param {string} name 
   * @returns {any}
   */
  getComputed(name) {
    if (!this.computed[name]) {
      console.warn(`SavageComponent: Computed property "${name}" not found`);
      return undefined;
    }

    // Check cache
    if (this._computedCache.has(name)) {
      return this._computedCache.get(name);
    }

    // Compute and cache
    const value = this.computed[name].call(this, this.reactor.state);
    this._computedCache.set(name, value);

    // Watch for recomputation
    this.reactor.watch(
      () => this.reactor.getState(),
      () => {
        this._computedCache.delete(name);
      }
    );

    return value;
  }

  /**
   * Mount the component to a DOM element
   * @param {string|HTMLElement} target - Selector or element
   * @param {boolean} declarative - Whether to preserve existing HTML (declarative mode)
   * @returns {HTMLElement} - The mounted element
   */
  mount(target, declarative = false) {
    if (this.isDestroyed) {
      throw new Error('Cannot mount destroyed component');
    }

    // Find target element
    const targetElement = typeof target === 'string' 
      ? document.querySelector(target) 
      : target;

    if (!targetElement) {
      throw new Error(`Mount target not found: ${target}`);
    }

    if (declarative) {
      // In declarative mode, use the existing HTML as-is
      console.log('Component: Declarative mount, using existing element');
      this.element = targetElement;
    } else {
      // Render component
      this.element = this._render();
      
      // Clear target and append component
      targetElement.innerHTML = '';
      targetElement.appendChild(this.element);
    }

    // Set up bindings
    console.log('Component: Setting up bindings...');
    this.binder.bind(this.element);
    console.log('Component: Bindings set up');

    // Mark as mounted
    this.isMounted = true;

    // Call mounted hook
    this._invokeHook('onMounted', this.element);

    // Set up update watcher
    this.reactor.watch(
      () => this.reactor.getState(),

      () => {
        this._invokeHook('onUpdated', this.element);
      }
    );

    return this.element;
  }

  /**
   * Update state
   * @param {Object} newState 
   */
  setState(newState) {
    if (this.isDestroyed) return;
    this.reactor.setState(newState);
  }

  /**
   * Get current state (non-reactive copy)
   * @returns {Object}
   */
  getState() {
    return this.reactor.getState();
  }

  /**
   * Get a state value by path
   * @param {string} path - Dot notation path
   * @returns {any}
   */
  get(path) {
    return path.split('.').reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : undefined;
    }, this.reactor.state);
  }

  /**
   * Set a state value by path
   * @param {string} path 
   * @param {any} value 
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const state = this.getState();
    
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, state);
    
    target[lastKey] = value;
    this.setState(state);
  }

  /**
   * Execute an action
   * @param {string} actionName 
   * @param {...any} args 
   */
  dispatch(actionName, ...args) {
    const action = this.actions[actionName];
    
    if (typeof action !== 'function') {
      console.warn(`SavageComponent: Action "${actionName}" not found`);
      return;
    }

    const result = action(this.getState(), ...args);
    
    // If action returns object, treat as state update
    if (result && typeof result === 'object') {
      this.setState(result);
    }
  }

  /**
   * Refresh the component (force re-render)
   */
  refresh() {
    if (!this.isMounted || this.isDestroyed) return;

    // Store current element reference
    const parent = this.element.parentNode;
    
    // Unbind current
    this.binder.unbind();

    // Re-render
    const newElement = this._render();
    
    // Replace in DOM
    if (parent) {
      parent.replaceChild(newElement, this.element);
    }
    
    this.element = newElement;

    // Re-bind
    this.binder.bind(this.element);

    // Call updated hook
    this._invokeHook('onUpdated', this.element);
  }

  /**
   * Unmount the component
   */
  unmount() {
    if (!this.isMounted || this.isDestroyed) return;

    this._invokeHook('onBeforeUnmount', this.element);

    // Clean up bindings
    this.binder.unbind();

    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.isMounted = false;

    this._invokeHook('onUnmounted');
  }

  /**
   * Destroy the component completely
   */
  destroy() {
    this.unmount();

    // Clean up reactor
    this.reactor.destroy();

    this.isDestroyed = true;
    this.element = null;
    this._computedCache.clear();
  }
}

export default SavageComponent;
