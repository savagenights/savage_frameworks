/**
 * SavageBinder - DOM Binding System
 * 
 * Handles automatic synchronization between reactive state and DOM elements.
 * Implements directive parsing and two-way data binding.
 * 
 * Standards: DOM Living Standard, HTML Living Standard
 * Reference: https://dom.spec.whatwg.org/, https://html.spec.whatwg.org/
 */

import { isReactive } from './reactor.js';

/**
 * Directive registry
 */
const DIRECTIVES = {
  // Data binding
  BIND: 'data-bind',
  MODEL: 'data-model',
  
  // Event handling
  ON: 'data-on',
  ACTION: 'data-action',
  
  // Conditional/looping
  IF: 'data-if',
  FOR: 'data-for',
  
  // Styling
  CLASS: 'data-class',
  STYLE: 'data-style',
  
  // Component
  SAVAGE: 'data-savage'
};

/**
 * Utility to safely evaluate expressions in context
 * @param {string} expression 
 * @param {Object} context 
 * @returns {any}
 */
function evaluateExpression(expression, context) {
  try {
    // Create a safe function with context as parameters
    const keys = Object.keys(context);
    const values = Object.values(context);
    
    const fn = new Function(...keys, `return (${expression})`);
    return fn(...values);
  } catch (err) {
    console.warn(`SavageBinder: Error evaluating expression "${expression}":`, err);
    return undefined;
  }
}

/**
 * Get value from object by path
 * @param {Object} obj 
 * @param {string} path - Dot notation (e.g., "user.name")
 * @returns {any}
 */
function getByPath(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Set value in object by path
 * @param {Object} obj 
 * @param {string} path 
 * @param {any} value 
 */
function setByPath(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * SavageBinder Class
 * Manages DOM-to-state bindings
 */
export class SavageBinder {
  constructor(reactor, component) {
    this.reactor = reactor;
    this.component = component;
    this.bindings = new Map();
    this.unsubscribers = [];
    this.eventListeners = [];
  }

  /**
   * Bind all directives within an element
   * @param {HTMLElement} rootElement 
   */
  bind(rootElement) {
    if (!rootElement) return;

    // Find all elements with directives
    const elements = this._findDirectiveElements(rootElement);
    
    elements.forEach(el => {
      this._processElement(el);
    });
  }

  /**
   * Find all elements with Savage directives
   * @param {HTMLElement} root 
   * @returns {Array<HTMLElement>}
   * @private
   */
  _findDirectiveElements(root) {
    const selector = Object.values(DIRECTIVES).map(d => `[${d}]`).join(', ');
    return Array.from(root.querySelectorAll(selector));
  }

  /**
   * Process a single element's directives
   * @param {HTMLElement} el 
   * @private
   */
  _processElement(el) {
    const attributes = Array.from(el.attributes);
    
    attributes.forEach(attr => {
      const name = attr.name;
      const value = attr.value;

      switch (name) {
        case DIRECTIVES.BIND:
          this._bindData(el, value);
          break;
        case DIRECTIVES.MODEL:
          this._bindModel(el, value);
          break;
        case DIRECTIVES.ON:
          this._bindEvent(el, value);
          break;
        case DIRECTIVES.ACTION:
          this._bindAction(el, value);
          break;
        case DIRECTIVES.IF:
          this._bindConditional(el, value);
          break;
        case DIRECTIVES.CLASS:
          this._bindClass(el, value);
          break;
        case DIRECTIVES.STYLE:
          this._bindStyle(el, value);
          break;
      }
    });
  }

  /**
   * Bind element content to state property
   * @param {HTMLElement} el 
   * @param {string} path - State property path
   * @private
   */
  _bindData(el, path) {
    // Initial update
    const value = getByPath(this.reactor.state, path);
    this._updateElementContent(el, value);

    // Watch for changes
    const unsubscribe = this.reactor.watch(
      () => getByPath(this.reactor.state, path),
      () => {
        const newValue = getByPath(this.reactor.state, path);
        this._updateElementContent(el, newValue);
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Two-way binding for form inputs
   * @param {HTMLElement} el 
   * @param {string} path 
   * @private
   */
  _bindModel(el, path) {
    // Get input type
    const tagName = el.tagName.toLowerCase();
    const type = el.type;

    // Set initial value
    const value = getByPath(this.reactor.state, path);
    this._setInputValue(el, value, tagName, type);

    // Watch for state changes
    const unsubscribe = this.reactor.watch(
      () => getByPath(this.reactor.state, path),
      () => {
        const newValue = getByPath(this.reactor.state, path);
        this._setInputValue(el, newValue, tagName, type);
      }
    );
    this.unsubscribers.push(unsubscribe);

    // Listen for input changes
    const eventType = tagName === 'input' && type === 'checkbox' ? 'change' : 'input';
    
    const handler = (e) => {
      let newValue;
      
      if (tagName === 'input' && type === 'checkbox') {
        newValue = e.target.checked;
      } else if (tagName === 'input' && type === 'number') {
        newValue = e.target.valueAsNumber || 0;
      } else {
        newValue = e.target.value;
      }

      // Update state
      const currentState = this.reactor.getState();
      setByPath(currentState, path, newValue);
      this.reactor.setState(currentState);
    };

    el.addEventListener(eventType, handler);
    this.eventListeners.push({ el, type: eventType, handler });
  }

  /**
   * Bind event handlers
   * @param {HTMLElement} el 
   * @param {string} value - Event spec like "click: handleClick" or "click: handler | prevent"
   * @private
   */
  _bindEvent(el, value) {
    const events = value.split(';').map(e => e.trim());
    
    events.forEach(eventSpec => {
      const [eventName, handlerSpec] = eventSpec.split(':').map(s => s.trim());
      if (!eventName || !handlerSpec) return;

      // Parse modifiers (e.g., "handler | prevent | stop")
      const parts = handlerSpec.split('|').map(s => s.trim());
      const handlerName = parts[0];
      const modifiers = parts.slice(1);

      const handler = (e) => {
        // Apply modifiers
        if (modifiers.includes('prevent')) e.preventDefault();
        if (modifiers.includes('stop')) e.stopPropagation();
        if (modifiers.includes('self') && e.target !== el) return;

        // Get handler from component
        const fn = this.component.actions?.[handlerName] || this.component[handlerName];
        
        if (typeof fn === 'function') {
          // Get current state as first argument
          const result = fn(this.reactor.getState(), e);
          
          // If result is object, treat as state update
          if (result && typeof result === 'object' && !result._eventHandled) {
            this.reactor.setState(result);
          }
        } else {
          console.warn(`SavageBinder: Handler "${handlerName}" not found`);
        }
      };

      el.addEventListener(eventName, handler);
      this.eventListeners.push({ el, type: eventName, handler });
    });
  }

  /**
   * Bind action buttons (shorthand for simple actions)
   * @param {HTMLElement} el 
   * @param {string} actionName 
   * @private
   */
  _bindAction(el, actionName) {
    const handler = (e) => {
      const fn = this.component.actions?.[actionName];
      
      if (typeof fn === 'function') {
        const result = fn(this.reactor.getState());
        
        if (result && typeof result === 'object') {
          this.reactor.setState(result);
        }
      } else {
        console.warn(`SavageBinder: Action "${actionName}" not found`);
      }
    };

    el.addEventListener('click', handler);
    this.eventListeners.push({ el, type: 'click', handler });
  }

  /**
   * Conditional rendering
   * @param {HTMLElement} el 
   * @param {string} expression 
   * @private
   */
  _bindConditional(el, expression) {
    // Store original content
    const placeholder = document.createComment('savage-if: ' + expression);
    const parent = el.parentNode;
    
    // Create a wrapper to hold the element
    el._savagePlaceholder = placeholder;
    el._savageParent = parent;

    const update = () => {
      const condition = evaluateExpression(expression, this.reactor.getState());
      
      if (condition) {
        if (!el.parentNode) {
          parent.insertBefore(el, placeholder);
        }
      } else {
        if (el.parentNode) {
          parent.removeChild(el);
        }
      }
    };

    // Initial render
    update();

    // Watch all state changes (simple approach)
    const unsubscribe = this.reactor.watch(
      () => this.reactor.getState(),
      update
    );
    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Dynamic class binding
   * @param {HTMLElement} el 
   * @param {string} value - Object literal or single class
   * @private
   */
  _bindClass(el, value) {
    // Check if it's an object expression { active: condition }
    if (value.trim().startsWith('{')) {
      const update = () => {
        const classes = evaluateExpression(value, this.reactor.getState());
        
        if (classes && typeof classes === 'object') {
          Object.entries(classes).forEach(([className, condition]) => {
            if (condition) {
              el.classList.add(className);
            } else {
              el.classList.remove(className);
            }
          });
        }
      };

      update();

      const unsubscribe = this.reactor.watch(
        () => this.reactor.getState(),
        update
      );
      this.unsubscribers.push(unsubscribe);
    } else {
      // Simple binding to a boolean property
      const update = () => {
        const condition = getByPath(this.reactor.state, value);
        if (condition) {
          el.classList.add(value);
        } else {
          el.classList.remove(value);
        }
      };

      update();

      const unsubscribe = this.reactor.watch(
        () => getByPath(this.reactor.state, value),
        update
      );
      this.unsubscribers.push(unsubscribe);
    }
  }

  /**
   * Dynamic style binding
   * @param {HTMLElement} el 
   * @param {string} value 
   * @private
   */
  _bindStyle(el, value) {
    const update = () => {
      const styles = evaluateExpression(value, this.reactor.getState());
      
      if (styles && typeof styles === 'object') {
        Object.entries(styles).forEach(([property, val]) => {
          el.style[property] = val;
        });
      }
    };

    update();

    const unsubscribe = this.reactor.watch(
      () => this.reactor.getState(),
      update
    );
    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Update element content based on value type
   * @param {HTMLElement} el 
   * @param {any} value 
   * @private
   */
  _updateElementContent(el, value) {
    // Handle different input types
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      this._setInputValue(el, value, el.tagName.toLowerCase(), el.type);
    } else {
      // Text content for regular elements
      el.textContent = value != null ? value : '';
    }
  }

  /**
   * Set input element value appropriately
   * @param {HTMLElement} el 
   * @param {any} value 
   * @param {string} tagName 
   * @param {string} type 
   * @private
   */
  _setInputValue(el, value, tagName, type) {
    if (tagName === 'input' && type === 'checkbox') {
      el.checked = Boolean(value);
    } else if (tagName === 'input' && type === 'radio') {
      el.checked = el.value === String(value);
    } else if (tagName === 'input' && type === 'number') {
      el.valueAsNumber = value || 0;
    } else {
      el.value = value != null ? value : '';
    }
  }

  /**
   * Unbind all listeners and clean up
   */
  unbind() {
    // Remove event listeners
    this.eventListeners.forEach(({ el, type, handler }) => {
      el.removeEventListener(type, handler);
    });
    this.eventListeners = [];

    // Unsubscribe from state changes
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];

    // Clear bindings
    this.bindings.clear();
  }
}

export default SavageBinder;
