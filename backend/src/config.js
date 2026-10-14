const fs = require('node:fs/promises');
const path = require('node:path');

// Follows the code location, unless a deploy sets DATA_DIR.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../data');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    throw new Error(`Cannot start: unable to create data directory ${DATA_DIR}. ${error.message}`);
  }
}

module.exports = {
  DATA_DIR,
  ensureDataDir,
};
