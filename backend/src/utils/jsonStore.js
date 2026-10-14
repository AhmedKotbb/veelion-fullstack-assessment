const fs = require('node:fs/promises');

const fileQueues = new Map();

// Lines up work for one file so the next save waits until the current one is done.
function enqueueFileOperation(filePath, operation) {
  const previous = fileQueues.get(filePath) ?? Promise.resolve();
  const current = previous.then(operation, operation);

  fileQueues.set(
    filePath,
    current.then(
      () => undefined,
      () => undefined
    )
  );

  return current;
}

// Reads the file and returns the list. Logs and throws if it is missing, broken, or not a list.
async function readJsonArrayFromDisk(filePath) {
  let raw;

  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Data file is missing: ${filePath}`);
      const missingFileError = new Error(`Data file is missing: ${filePath}`);
      missingFileError.statusCode = 500;
      throw missingFileError;
    }

    throw error;
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error(`Data file is not valid JSON: ${filePath}`);
    const invalidJsonError = new Error(`Data file is not valid JSON: ${filePath}`);
    invalidJsonError.statusCode = 500;
    invalidJsonError.cause = error;
    throw invalidJsonError;
  }

  if (!Array.isArray(parsed)) {
    console.error(`Data file is not a JSON array: ${filePath}`);
    const invalidShapeError = new Error(`Data file is not a JSON array: ${filePath}`);
    invalidShapeError.statusCode = 500;
    throw invalidShapeError;
  }

  return parsed;
}

// Writes the list to a temp file, then renames that file over the real one.
async function writeJsonArrayToDisk(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.rename(tempPath, filePath);
}

// Reads the list, but waits if something else is already using this file.
async function readJsonArray(filePath) {
  return enqueueFileOperation(filePath, () => readJsonArrayFromDisk(filePath));
}

// Writes the list, but waits if something else is already using this file.
async function writeJsonArray(filePath, data) {
  return enqueueFileOperation(filePath, () => writeJsonArrayToDisk(filePath, data));
}

// Reads the list, lets the caller change it, then saves it, all as one turn.
async function modifyJsonArray(filePath, mutator) {
  return enqueueFileOperation(filePath, async () => {
    const items = await readJsonArrayFromDisk(filePath);
    const result = await mutator(items);
    await writeJsonArrayToDisk(filePath, items);
    return result;
  });
}

// Checks the file before startup. Creates an empty list if it is missing, and throws if it cannot be used.
async function ensureJsonArrayFile(filePath) {
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Cannot start: unable to read ${filePath}. ${error.message}`);
    }

    try {
      await writeJsonArrayToDisk(filePath, []);
      return;
    } catch (writeError) {
      if (writeError.code === 'ENOENT') {
        throw new Error(`Cannot start: data directory is missing for ${filePath}.`);
      }

      throw new Error(`Cannot start: failed to create ${filePath}. ${writeError.message}`);
    }
  }

  let raw;

  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Cannot start: unable to read ${filePath}. ${error.message}`);
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Cannot start: ${filePath} is not valid JSON. ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Cannot start: ${filePath} must contain a JSON array.`);
  }
}

module.exports = {
  readJsonArray,
  writeJsonArray,
  modifyJsonArray,
  ensureJsonArrayFile,
};
