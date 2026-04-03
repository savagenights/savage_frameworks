/**
 * Savage Frameworks - Rollup Configuration
 * Build setup for distribution files
 */

import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const banner = `/**
 * 🦁 Savage Frameworks v0.1.0-alpha
 * A lightweight, open-source HTML, CSS, and JavaScript framework
 * for building reactive websites.
 * 
 * @license MIT
 * @repository https://github.com/savagenights/savage_frameworks.git
 * @built ${new Date().toISOString()}
 */`;

export default [
  // ES Module build
  {
    input: 'src/savage.js',
    output: {
      file: 'dist/savage.esm.js',
      format: 'es',
      banner
    },
    plugins: [resolve()]
  },
  
  // UMD build (for browsers)
  {
    input: 'src/savage.js',
    output: {
      file: 'dist/savage.js',
      format: 'umd',
      name: 'Savage',
      banner
    },
    plugins: [resolve()]
  },
  
  // Minified UMD build (production)
  {
    input: 'src/savage.js',
    output: {
      file: 'dist/savage.min.js',
      format: 'umd',
      name: 'Savage',
      banner
    },
    plugins: [
      resolve(),
      terser({
        format: {
          comments: /^!/
        }
      })
    ]
  },
  
  // Development build (with source maps)
  {
    input: 'src/savage.js',
    output: {
      file: 'dist/savage.dev.js',
      format: 'umd',
      name: 'Savage',
      banner,
      sourcemap: true
    },
    plugins: [resolve()]
  }
];
