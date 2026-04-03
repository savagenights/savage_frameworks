/**
 * 🦁 Savage Frameworks - Main Entry Point
 * 
 * A lightweight, open-source HTML, CSS, and JavaScript framework
 * for building reactive websites.
 * 
 * @version 0.1.0-alpha
 * @author Savage Nights Collective
 * @license MIT
 * @repository https://github.com/savagenights/savage_frameworks.git
 * 
 * Standards:
 * - HTML Living Standard: https://html.spec.whatwg.org/
 * - CSS Snapshot 2023: https://www.w3.org/TR/css-2023/
 * - ECMAScript 2025: https://ecma-international.org/publications-and-standards/standards/ecma-262/
 * - DOM Living Standard: https://dom.spec.whatwg.org/
 */

// Core exports
export { SavageApp, createApp } from './core/app.js';
export { SavageComponent } from './core/component.js';
export { SavageReactor, isReactive } from './core/reactor.js';
export { SavageBinder } from './core/binder.js';
export { VERSION, getVersion, BUILD_INFO } from './core/version.js';

// Utilities
export { SavageHttp, createHttpClient, http, ResponseUtils } from './utils/http.js';
export { SavageValidator, ValidationRules, ErrorMessages, createValidator, validateElement } from './utils/validation.js';

// Directives
export { directives, registerDirective, getDirective, applyDirective, getBuiltInDirectives } from './directives/index.js';

// Router
export { SavageRouter, createRouter } from './router/index.js';

// Store
export { SavageStore, createStore, createLoggerPlugin, createPersistencePlugin } from './store/index.js';

// Animations
export {
  animate,
  enter,
  leave,
  transition,
  stagger,
  shake,
  pulse,
  highlight,
  Transitions,
  Easings,
  SavageTransition
} from './animations/index.js';

// Main SavageApp class as default export
import { SavageApp, createApp } from './core/app.js';
export default SavageApp;

// Global API for CDN/script tag usage
if (typeof window !== 'undefined') {
  // For ES modules in browser, we need to use dynamic imports
  // or load from built bundle. CDN usage requires the built file.
  console.log('🦁 Savage Frameworks v' + VERSION + ' - Import from CDN or use ESM imports');
}
