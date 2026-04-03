/**
 * Savage Frameworks - Version Information
 * 
 * This file MUST be updated with every release.
 * Version integrity between code, git tags, and package.json is critical.
 * 
 * @see DEVELOPMENT.md - Version Control & Integrity Protocol
 */

export const VERSION = '0.1.0-alpha';

export const BUILD_INFO = {
  version: VERSION,
  codename: 'Foundation',
  buildDate: '2026-04',
  targetStandards: {
    html: 'Living Standard',
    css: 'Snapshot 2023',
    javascript: 'ES2025',
    dom: 'Living Standard'
  }
};

/**
 * Returns framework version information
 * @returns {Object} Version and build details
 */
export function getVersion() {
  return { ...BUILD_INFO };
}

/**
 * Checks if running version matches expected
 * Used internally for debugging and compatibility checks
 * @param {string} expectedVersion 
 * @returns {boolean}
 */
export function checkVersion(expectedVersion) {
  return VERSION === expectedVersion;
}
