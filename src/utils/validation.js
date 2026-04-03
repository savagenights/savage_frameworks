/**
 * Savage Validation - Form Validation Utilities
 * 
 * Standards-compliant validation library for forms.
 * Supports HTML5 validation attributes and custom rules.
 * 
 * Standards: HTML Living Standard (form validation)
 * Reference: https://html.spec.whatwg.org/
 */

/**
 * Built-in validation rules
 */
export const ValidationRules = {
  /**
   * Required field
   * @param {any} value 
   * @returns {boolean}
   */
  required: (value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== null && value !== undefined;
  },

  /**
   * Minimum length
   * @param {number} min 
   * @returns {Function}
   */
  minLength: (min) => (value) => {
    if (!value) return true;
    return String(value).length >= min;
  },

  /**
   * Maximum length
   * @param {number} max 
   * @returns {Function}
   */
  maxLength: (max) => (value) => {
    if (!value) return true;
    return String(value).length <= max;
  },

  /**
   * Email format
   * @param {string} value 
   * @returns {boolean}
   */
  email: (value) => {
    if (!value) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(value));
  },

  /**
   * URL format
   * @param {string} value 
   * @returns {boolean}
   */
  url: (value) => {
    if (!value) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Number range
   * @param {number} min 
   * @param {number} max 
   * @returns {Function}
   */
  range: (min, max) => (value) => {
    if (value === null || value === undefined || value === '') return true;
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  },

  /**
   * Pattern match
   * @param {RegExp} regex 
   * @returns {Function}
   */
  pattern: (regex) => (value) => {
    if (!value) return true;
    return regex.test(String(value));
  },

  /**
   * Match another field
   * @param {string} fieldName 
   * @returns {Function}
   */
  match: (fieldName) => (value, formData) => {
    return value === formData[fieldName];
  },

  /**
   * Custom validator
   * @param {Function} fn 
   * @returns {Function}
   */
  custom: (fn) => fn
};

/**
 * Default error messages
 */
export const ErrorMessages = {
  required: 'This field is required',
  minLength: (min) => `Must be at least ${min} characters`,
  maxLength: (max) => `Must be at most ${max} characters`,
  email: 'Please enter a valid email address',
  url: 'Please enter a valid URL',
  range: (min, max) => `Must be between ${min} and ${max}`,
  pattern: 'Invalid format',
  match: (field) => `Must match ${field}`
};

/**
 * SavageValidator Class
 */
export class SavageValidator {
  constructor(rules = {}, messages = {}) {
    this.rules = rules;
    this.messages = { ...ErrorMessages, ...messages };
    this.errors = {};
  }

  /**
   * Validate a single field
   * @param {string} fieldName 
   * @param {any} value 
   * @param {Object} formData 
   * @returns {string|null}
   */
  validateField(fieldName, value, formData = {}) {
    const fieldRules = this.rules[fieldName];
    if (!fieldRules) return null;

    // Normalize rules to array
    const rulesArray = Array.isArray(fieldRules) ? fieldRules : [fieldRules];

    for (const rule of rulesArray) {
      let validator;
      let message;

      if (typeof rule === 'string') {
        // Simple rule name like 'required'
        validator = ValidationRules[rule];
        message = this.messages[rule] || 'Invalid value';
      } else if (typeof rule === 'function') {
        // Custom validator function
        validator = rule;
        message = 'Invalid value';
      } else if (typeof rule === 'object') {
        // Rule with options: { rule: 'minLength', params: [5], message: 'Custom' }
        const ruleName = rule.rule;
        const params = rule.params || [];
        const ruleFn = ValidationRules[ruleName];
        
        // Check if rule is a factory (needs params to create validator) or direct validator
        const factoryRules = ['minLength', 'maxLength', 'range', 'pattern', 'match'];
        if (factoryRules.includes(ruleName)) {
          // Factory: call with params to get validator function
          validator = ruleFn(...params);
        } else {
          // Direct validator: use as-is (required, email, url)
          validator = ruleFn;
        }
        
        message = rule.message || this._getDefaultMessage(ruleName, params);
      }

      if (validator && !validator(value, formData)) {
        return typeof message === 'function' ? message() : message;
      }
    }

    return null;
  }

  /**
   * Get default error message for rule
   * @param {string} ruleName 
   * @param {Array} params 
   * @returns {string}
   * @private
   */
  _getDefaultMessage(ruleName, params) {
    const msg = this.messages[ruleName];
    if (typeof msg === 'function') {
      return msg(...params);
    }
    return msg || 'Invalid value';
  }

  /**
   * Validate entire form
   * @param {Object} formData 
   * @returns {Object}
   */
  validate(formData) {
    this.errors = {};
    let isValid = true;

    Object.keys(this.rules).forEach(fieldName => {
      const error = this.validateField(fieldName, formData[fieldName], formData);
      if (error) {
        this.errors[fieldName] = error;
        isValid = false;
      }
    });

    return {
      isValid,
      errors: { ...this.errors },
      firstError: Object.values(this.errors)[0] || null
    };
  }

  /**
   * Check if field has error
   * @param {string} fieldName 
   * @returns {boolean}
   */
  hasError(fieldName) {
    return !!this.errors[fieldName];
  }

  /**
   * Get error for field
   * @param {string} fieldName 
   * @returns {string|null}
   */
  getError(fieldName) {
    return this.errors[fieldName] || null;
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors = {};
  }

  /**
   * Clear error for specific field
   * @param {string} fieldName 
   */
  clearFieldError(fieldName) {
    delete this.errors[fieldName];
  }
}

/**
 * Validate HTML5 form element
 * @param {HTMLElement} element 
 * @returns {Object}
 */
export function validateElement(element) {
  const value = element.value;
  const errors = [];

  // Check required
  if (element.required && !ValidationRules.required(value)) {
    errors.push(element.dataset.errorRequired || 'This field is required');
  }

  // Check minlength
  if (element.minLength && value) {
    const minLen = parseInt(element.minLength);
    if (!ValidationRules.minLength(minLen)(value)) {
      errors.push(`Must be at least ${minLen} characters`);
    }
  }

  // Check maxlength
  if (element.maxLength && value) {
    const maxLen = parseInt(element.maxLength);
    if (!ValidationRules.maxLength(maxLen)(value)) {
      errors.push(`Must be at most ${maxLen} characters`);
    }
  }

  // Check pattern
  if (element.pattern && value) {
    const regex = new RegExp(element.pattern);
    if (!ValidationRules.pattern(regex)(value)) {
      errors.push(element.dataset.errorPattern || 'Invalid format');
    }
  }

  // Check type-specific validation
  if (element.type === 'email' && value) {
    if (!ValidationRules.email(value)) {
      errors.push('Please enter a valid email address');
    }
  }

  if (element.type === 'url' && value) {
    if (!ValidationRules.url(value)) {
      errors.push('Please enter a valid URL');
    }
  }

  // Check min/max for numbers
  if (element.type === 'number' && value) {
    const min = element.min !== '' ? parseFloat(element.min) : null;
    const max = element.max !== '' ? parseFloat(element.max) : null;
    const num = parseFloat(value);
    
    if (min !== null && num < min) {
      errors.push(`Must be at least ${min}`);
    }
    if (max !== null && num > max) {
      errors.push(`Must be at most ${max}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    element
  };
}

/**
 * Create validator instance
 * @param {Object} rules 
 * @param {Object} messages 
 * @returns {SavageValidator}
 */
export function createValidator(rules = {}, messages = {}) {
  return new SavageValidator(rules, messages);
}

export default SavageValidator;
