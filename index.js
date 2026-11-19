// The installed extension's entry point: the wrangler imports `index.js` from
// <DATA_DIR>/extensions/quick-session/ and reads the default export. Tests import
// server/manifest.js instead.
export { dir } from './server/manifest.js';
export { default } from './server/manifest.js';
