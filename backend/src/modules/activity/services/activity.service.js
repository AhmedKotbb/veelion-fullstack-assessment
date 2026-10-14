const fs = require('node:fs');
const path = require('node:path');

const { DATA_DIR } = require('../../../config');
const { createId } = require('../../../utils/id');

const fp = path.join(DATA_DIR, 'activity.json');

function loadDataA() {
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, '[]');
  }

  let raw = fs.readFileSync(fp, 'utf8');
  if (!raw) {
    raw = '[]';
  }

  return JSON.parse(raw);
}

function loadDataB() {
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, '[]');
  }

  let raw = fs.readFileSync(fp, 'utf8');
  if (!raw) {
    raw = '[]';
  }

  return JSON.parse(raw);
}

function getAllActivity() {
  const arr = loadDataA();
  return arr;
}

function createNewActivity(payload) {
  const list = loadDataB();
  const entry = {
    id: createId(),
    action: payload.action,
    when: new Date().toISOString(),
  };

  if (Object.hasOwn(payload, 'info')) {
    entry.info = payload.info;
  }

  list.push(entry);
  fs.writeFileSync(fp, JSON.stringify(list, null, 2));
  return entry;
}

module.exports = {
  getAllActivity,
  createNewActivity,
};
