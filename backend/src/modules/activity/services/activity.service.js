const path = require('node:path');

const { DATA_DIR } = require('../../../config');
const { createId } = require('../../../utils/id');
const { readJsonArray, modifyJsonArray, ensureJsonArrayFile } = require('../../../utils/jsonStore');

const ACTIVITY_FILE_PATH = path.join(DATA_DIR, 'activity.json');

async function getAllActivity() {
  return readJsonArray(ACTIVITY_FILE_PATH);
}

async function createNewActivity(payload) {
  return modifyJsonArray(ACTIVITY_FILE_PATH, (list) => {
    const entry = {
      id: createId(),
      action: payload.action,
      when: new Date().toISOString(),
    };

    if (Object.hasOwn(payload, 'info')) {
      entry.info = payload.info;
    }

    list.push(entry);
    return entry;
  });
}

function ensureActivityFile() {
  return ensureJsonArrayFile(ACTIVITY_FILE_PATH);
}

module.exports = {
  getAllActivity,
  createNewActivity,
  ensureActivityFile,
};
