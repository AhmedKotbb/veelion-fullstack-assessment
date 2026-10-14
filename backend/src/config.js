const fs = require('node:fs/promises');
const path = require('node:path');

// Follows the code location, unless a deploy sets DATA_DIR.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../data');

// Browser origins allowed to call the API, comma-separated.
// Empty unless set: the Next.js app calls this API from the server and does not need CORS.
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    throw new Error(`Cannot start: unable to create data directory ${DATA_DIR}. ${error.message}`);
  }
}

module.exports = {
  DATA_DIR,
  CORS_ORIGINS,
  ensureDataDir,
};
