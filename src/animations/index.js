/**
 * Savage Animations - Animation and Transition System
 * 
 * Standards-compliant animation utilities using Web Animations API
 * and CSS transitions.
 * 
 * Standards: Web Animations API, CSS Animations
 * Reference: https://www.w3.org/TR/css-animations-1/
 */

/**
 * Built-in transition presets
 */
export const Transitions = {
  fade: {
    enter: { opacity: [0, 1] },
    leave: { opacity: [1, 0] },
    duration: 300
  },
  
  slideUp: {
    enter: { opacity: [0, 1], transform: ['translateY(20px)', 'translateY(0)'] },
    leave: { opacity: [1, 0], transform: ['translateY(0)', 'translateY(-20px)'] },
    duration: 300
  },
  
  slideDown: {
    enter: { opacity: [0, 1], transform: ['translateY(-20px)', 'translateY(0)'] },
    leave: { opacity: [1, 0], transform: ['translateY(0)', 'translateY(20px)'] },
    duration: 300
  },
  
  scale: {
    enter: { opacity: [0, 1], transform: ['scale(0.9)', 'scale(1)'] },
    leave: { opacity: [1, 0], transform: ['scale(1)', 'scale(0.9)'] },
    duration: 300
  },
  
  zoom: {
    enter: { opacity: [0, 1], transform: ['scale(0)', 'scale(1)'] },
    leave: { opacity: [1, 0], transform: ['scale(1)', 'scale(0)'] },
    duration: 300
  },
  
  flip: {
    enter: { opacity: [0, 1], transform: ['rotateY(90deg)', 'rotateY(0deg)'] },
    leave: { opacity: [1, 0], transform: ['rotateY(0deg)', 'rotateY(90deg)'] },
    duration: 400
  }
};

/**
 * Easing functions
 */
export const Easings = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
};

/**
 * Animate element using Web Animations API
 * @param {HTMLElement} element 
 * @param {Object} keyframes 
 * @param {Object} options 
 * @returns {Animation}
 */
export function animate(element, keyframes, options = {}) {
  const animation = element.animate(keyframes, {
    duration: options.duration || 300,
    delay: options.delay || 0,
    easing: options.easing || 'ease',
    fill: options.fill || 'both',
    iterations: options.iterations || 1,
    direction: options.direction || 'normal'
  });

  if (options.onComplete) {
    animation.onfinish = options.onComplete;
  }

  return animation;
}

/**
 * Enter transition
 * @param {HTMLElement} element 
 * @param {string|Object} transition 
 * @param {Object} options 
 * @returns {Promise}
 */
export function enter(element, transition = 'fade', options = {}) {
  const config = typeof transition === 'string'
    ? Transitions[transition]
    : transition;

  if (!config) {
    console.warn(`Unknown transition: ${transition}`);
    return Promise.resolve();
  }

  // Ensure element is visible before animating
  element.style.display = '';

  return new Promise(resolve => {
    animate(element, config.enter, {
      duration: options.duration || config.duration,
      easing: options.easing || config.easing || 'ease',
      onComplete: () => {
        element.style.opacity = '';
        element.style.transform = '';
        resolve();
      }
    });
  });
}

/**
 * Leave transition
 * @param {HTMLElement} element 
 * @param {string|Object} transition 
 * @param {Object} options 
 * @returns {Promise}
 */
export function leave(element, transition = 'fade', options = {}) {
  const config = typeof transition === 'string'
    ? Transitions[transition]
    : transition;

  if (!config) {
    console.warn(`Unknown transition: ${transition}`);
    return Promise.resolve();
  }

  return new Promise(resolve => {
    animate(element, config.leave, {
      duration: options.duration || config.duration,
      easing: options.easing || config.easing || 'ease',
      onComplete: () => {
        element.style.display = 'none';
        element.style.opacity = '';
        element.style.transform = '';
        resolve();
      }
    });
  });
}

/**
 * Transition component - toggles visibility with animation
 * @param {HTMLElement} element 
 * @param {boolean} show 
 * @param {string|Object} transition 
 * @param {Object} options 
 * @returns {Promise}
 */
export function transition(element, show, transition = 'fade', options = {}) {
  if (show) {
    return enter(element, transition, options);
  } else {
    return leave(element, transition, options);
  }
}

/**
 * Stagger animations for multiple elements
 * @param {Array<HTMLElement>} elements 
 * @param {Object} keyframes 
 * @param {Object} options 
 * @returns {Promise}
 */
export function stagger(elements, keyframes, options = {}) {
  const staggerDelay = options.stagger || 50;
  const animations = [];

  elements.forEach((element, index) => {
    const delay = index * staggerDelay;
    const animation = animate(element, keyframes, {
      ...options,
      delay: (options.delay || 0) + delay
    });
    animations.push(animation.finished);
  });

  return Promise.all(animations);
}

/**
 * Shake animation for attention
 * @param {HTMLElement} element 
 * @param {Object} options 
 * @returns {Animation}
 */
export function shake(element, options = {}) {
  return animate(element, [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(0)' }
  ], {
    duration: options.duration || 500,
    easing: options.easing || 'ease-in-out'
  });
}

/**
 * Pulse animation
 * @param {HTMLElement} element 
 * @param {Object} options 
 * @returns {Animation}
 */
export function pulse(element, options = {}) {
  return animate(element, [
    { transform: 'scale(1)' },
    { transform: 'scale(1.05)' },
    { transform: 'scale(1)' }
  ], {
    duration: options.duration || 300,
    easing: options.easing || 'ease-in-out',
    iterations: options.iterations || 2
  });
}

/**
 * Highlight/flash animation
 * @param {HTMLElement} element 
 * @param {Object} options 
 * @returns {Animation}
 */
export function highlight(element, options = {}) {
  return animate(element, [
    { backgroundColor: 'transparent' },
    { backgroundColor: options.color || '#fef3c7' },
    { backgroundColor: 'transparent' }
  ], {
    duration: options.duration || 1000,
    easing: options.easing || 'ease-out'
  });
}

/**
 * CSS class-based animation helper
 * @param {HTMLElement} element 
 * @param {string} enterClass 
 * @param {string} leaveClass 
 * @param {number} duration 
 * @returns {Promise}
 */
export function cssTransition(element, enterClass, leaveClass, duration = 300) {
  return new Promise(resolve => {
    // Add enter class
    element.classList.add(enterClass);
    
    // Force reflow
    void element.offsetWidth;
    
    // Remove enter class (triggering transition)
    element.classList.remove(enterClass);
    
    // Wait for transition
    setTimeout(() => {
      element.classList.remove(leaveClass);
      resolve();
    }, duration);
  });
}

/**
 * Page transition helper
 * @param {HTMLElement} container 
 * @param {Function} renderFn 
 * @param {string|Object} transition 
 * @returns {Promise}
 */
export async function pageTransition(container, renderFn, transition = 'fade') {
  const oldContent = container.firstElementChild;
  
  if (oldContent) {
    await leave(oldContent, transition);
    container.innerHTML = '';
  }
  
  const newContent = renderFn();
  container.appendChild(newContent);
  
  await enter(newContent, transition);
}

/**
 * SavageTransition Component-like class
 * Manages enter/leave states for an element
 */
export class SavageTransition {
  constructor(element, options = {}) {
    this.element = element;
    this.transition = options.transition || 'fade';
    this.duration = options.duration || 300;
    this.visible = options.visible !== false;
    this.easing = options.easing || 'ease';
    
    if (!this.visible) {
      this.element.style.display = 'none';
    }
  }

  /**
   * Show element with animation
   * @returns {Promise}
   */
  async show() {
    if (this.visible) return;
    this.visible = true;
    await enter(this.element, this.transition, {
      duration: this.duration,
      easing: this.easing
    });
  }

  /**
   * Hide element with animation
   * @returns {Promise}
   */
  async hide() {
    if (!this.visible) return;
    this.visible = false;
    await leave(this.element, this.transition, {
      duration: this.duration,
      easing: this.easing
    });
  }

  /**
   * Toggle visibility
   * @returns {Promise}
   */
  async toggle() {
    if (this.visible) {
      await this.hide();
    } else {
      await this.show();
    }
  }
}

export default {
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
};
