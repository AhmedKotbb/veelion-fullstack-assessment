const app = require('./app');
const { ensureDataDir } = require('./config');
const { ensureTasksFile } = require('./modules/tasks/services/tasks.service');
const { ensureActivityFile } = require('./modules/activity/services/activity.service');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await ensureDataDir();
    await ensureTasksFile();
    await ensureActivityFile();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

start();
