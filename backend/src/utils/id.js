const { randomUUID } = require('node:crypto');

// Node 18 and later always provide randomUUID. A Date.now fallback can collide, so there is no fallback.
module.exports = {
  createId: randomUUID,
};
