const app = require('./app');
const { ensureTasksFile } = require('./modules/tasks/services/tasks.service');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await ensureTasksFile();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

start();
