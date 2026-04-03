/**
 * Savage Directives - Built-in Directive Library
 * 
 * HTML-First directive implementations for common use cases.
 * All directives follow standards-compliant attribute naming.
 * 
 * Standards: HTML Living Standard
 * Reference: https://html.spec.whatwg.org/
 */

import { SavageReactor } from '../core/reactor.js';

/**
 * Directive registry
 */
export const directives = new Map();

/**
 * Register a directive
 * @param {string} name - Directive name (without data- prefix)
 * @param {Function} handler - Directive handler function
 */
export function registerDirective(name, handler) {
  directives.set(name.toLowerCase(), handler);
}

/**
 * Get directive handler
 * @param {string} name 
 * @returns {Function|null}
 */
export function getDirective(name) {
  return directives.get(name.toLowerCase()) || null;
}

/**
 * v-show directive - Toggle visibility
 * Shows/hides element based on condition
 */
registerDirective('show', function(el, value, context) {
  const { reactor, component } = context;
  
  const update = () => {
    try {
      const condition = evaluateInContext(value, reactor.getState(), component.props);
      el.style.display = condition ? '' : 'none';
    } catch (err) {
      console.warn(`Savage Directive [show]: Error evaluating "${value}":`, err);
    }
  };

  // Initial update
  update();

  // Watch for changes
  return reactor.watch(
    () => reactor.getState(),
    update
  );
});

/**
 * v-for directive - List rendering
 * Renders element for each item in array
 */
registerDirective('for', function(el, value, context) {
  const { reactor, component, binder } = context;
  const parent = el.parentNode;
  
  // Parse expression: "item in items" or "(item, index) in items"
  const match = value.match(/\(?([^)]+)\)?\s+in\s+(.+)/);
  if (!match) {
    console.warn(`Savage Directive [for]: Invalid syntax "${value}"`);
    return;
  }

  const itemSpec = match[1].trim();
  const arrayPath = match[2].trim();
  
  // Extract item name and optional index name
  const itemParts = itemSpec.split(',').map(p => p.trim());
  const itemName = itemParts[0];
  const indexName = itemParts[1] || null;

  // Store template
  const template = el.cloneNode(true);
  template.removeAttribute('data-for');

  // Create comment marker
  const marker = document.createComment(` for: ${value} `);
  parent.insertBefore(marker, el);
  parent.removeChild(el);

  const itemElements = new Map();

  const update = () => {
    const array = getByPath(reactor.state, arrayPath);
    
    if (!Array.isArray(array)) {
      console.warn(`Savage Directive [for]: "${arrayPath}" is not an array`);
      return;
    }

    // Remove items no longer in array
    itemElements.forEach((el, key) => {
      if (!array[key]) {
        if (el.parentNode) el.parentNode.removeChild(el);
        itemElements.delete(key);
      }
    });

    // Add/update items
    array.forEach((item, index) => {
      const key = index; // Could use item.id if available

      if (!itemElements.has(key)) {
        // Create new element from template
        const newEl = template.cloneNode(true);
        
        // Create local scope
        const localContext = {
          [itemName]: item,
          ...(indexName ? { [indexName]: index } : {})
        };

        // Process bindings in this element with local context
        // This is simplified - full implementation would need more work
        processTemplate(newEl, localContext, reactor, component);

        parent.insertBefore(newEl, marker);
        itemElements.set(key, newEl);
      } else {
        // Update existing element
        const existingEl = itemElements.get(key);
        // Update bindings...
      }
    });
  };

  // Initial render
  update();

  // Watch array changes
  return reactor.watch(
    () => getByPath(reactor.state, arrayPath),
    update
  );
});

/**
 * v-cloak directive - Hide until compiled
 * Prevents uncompiled template flashing
 */
registerDirective('cloak', function(el, value, context) {
  // Remove cloak attribute after binding is complete
  el.removeAttribute('data-cloak');
});

/**
 * v-pre directive - Skip compilation
 * Prevents parsing on this element and children
 */
registerDirective('pre', function(el, value, context) {
  // Mark element to skip processing
  el._savageSkip = true;
});

/**
 * v-once directive - Render once
 * Only renders element once, skips updates
 */
registerDirective('once', function(el, value, context) {
  // Mark element to not subscribe to updates
  el._savageOnce = true;
});

/**
 * v-text directive - Set text content
 * Updates element textContent
 */
registerDirective('text', function(el, value, context) {
  const { reactor, component } = context;

  const update = () => {
    try {
      const result = evaluateInContext(value, reactor.getState(), component.props);
      el.textContent = result != null ? String(result) : '';
    } catch (err) {
      console.warn(`Savage Directive [text]: Error evaluating "${value}":`, err);
    }
  };

  update();

  return reactor.watch(
    () => reactor.getState(),
    update
  );
});

/**
 * v-html directive - Set innerHTML
 * Updates element innerHTML (use with caution)
 */
registerDirective('html', function(el, value, context) {
  const { reactor, component } = context;

  const update = () => {
    try {
      const result = evaluateInContext(value, reactor.getState(), component.props);
      el.innerHTML = result != null ? String(result) : '';
    } catch (err) {
      console.warn(`Savage Directive [html]: Error evaluating "${value}":`, err);
    }
  };

  update();

  return reactor.watch(
    () => reactor.getState(),
    update
  );
});

/**
 * v-else directive - Conditional else
 * Companion to v-if
 */
registerDirective('else', function(el, value, context) {
  // This is handled by the v-if directive
  // Mark this element as else block
  el._savageElse = true;
});

/**
 * v-else-if directive - Conditional else-if
 * Companion to v-if
 */
registerDirective('else-if', function(el, value, context) {
  // This is handled by the v-if directive
  el._savageElseIf = value;
});

/**
 * Utility: Get value by path
 * @param {Object} obj 
 * @param {string} path 
 * @returns {any}
 */
function getByPath(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Utility: Evaluate expression in context
 * @param {string} expression 
 * @param {Object} state 
 * @param {Object} props 
 * @returns {any}
 */
function evaluateInContext(expression, state, props = {}) {
  const context = { ...state, $state: state, $props: props };
  const keys = Object.keys(context);
  const values = Object.values(context);
  
  const fn = new Function(...keys, `return (${expression})`);
  return fn(...values);
}

/**
 * Utility: Process template with local context
 * @param {HTMLElement} el 
 * @param {Object} localContext 
 * @param {SavageReactor} reactor 
 * @param {SavageComponent} component 
 */
function processTemplate(el, localContext, reactor, component) {
  // Simple interpolation replacement
  const html = el.innerHTML;
  const processed = html.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expr) => {
    try {
      const keys = Object.keys(localContext);
      const values = Object.values(localContext);
      const fn = new Function(...keys, `return (${expr})`);
      const result = fn(...values);
      return result != null ? String(result) : '';
    } catch {
      return match;
    }
  });
  el.innerHTML = processed;
}

/**
 * Apply directive to element
 * @param {HTMLElement} el 
 * @param {string} directiveName 
 * @param {string} value 
 * @param {Object} context 
 * @returns {Function|null} Unsubscribe function
 */
export function applyDirective(el, directiveName, value, context) {
  const handler = getDirective(directiveName);
  if (!handler) {
    console.warn(`Savage Directives: Unknown directive "${directiveName}"`);
    return null;
  }

  try {
    return handler(el, value, context);
  } catch (err) {
    console.error(`Savage Directives: Error applying "${directiveName}":`, err);
    return null;
  }
}

/**
 * Get all built-in directive names
 * @returns {Array<string>}
   */
export function getBuiltInDirectives() {
  return Array.from(directives.keys());
}

export default {
  register: registerDirective,
  get: getDirective,
  apply: applyDirective,
  list: getBuiltInDirectives
};
