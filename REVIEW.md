# Backend

Tasks issues are listed first, then activity. Each item says what is wrong, what we should change, and why that change is the right one.

---

## Tasks module

### 1. PATCH can overwrite any field on a task (high)

The controller checks `title` and `completed`, then passes the whole request body to the service. The service spreads that body onto the saved task. A client can change `id`, fake `createdAt`, and add extra keys such as `isAdmin`. All of it gets written to disk. The old id then stops working.

**What we should do.** Call `validateCreateTask` and `validateUpdateTask` in the controller. Pass only the object they return to the service. On update, copy `title` and `completed` onto the existing task and leave every other field alone.

**Why.** The validator already returns a clean object with just those two fields, and it rejects anything else. The controller is the right place to call it, because that is where the request body is handled. The service should only save.

### 2. Two saves at the same time can drop a task (high)

Create, update, and delete all read `tasks.json`, change the list in memory, then write the whole file back. If two requests read the file before either one writes, the second write replaces the file and the first change is gone. There is no error. The task just disappears. Two browser tabs are enough to hit this.

**What we should do.** Add a small queue inside `jsonStore`, one chain of promises per file. The next write to that file waits until the previous one has finished.

**Why.** This app is a single Node process, so a promise chain is enough. We do not need a database lock. Putting the queue in `jsonStore` protects every caller, including activity once it uses the same store.

### 3. A bad tasks file gets replaced with an empty list (high)

If `tasks.json` is valid JSON but not an array, `readJsonArray` returns `[]`. The list looks empty, and the next create writes a new file over the old one. The old tasks are gone. If the file is missing, the read also creates an empty file, which hides a wrong path.

**What we should do.** If the contents are not an array, throw, log it, and return 500. Create a missing file once when the server starts, not inside the read.

**Why.** A read should leave a file it does not understand alone, so someone can fix it. Failing at startup makes a missing folder obvious, instead of an API that looks empty.

### 4. A crash in the middle of a save can break the file (high)

`writeJsonArray` uses `fs.writeFile`, which clears the file and then writes the new contents. If the process dies halfway (deploy, crash, full disk), the file is cut off. After that, every tasks request fails until someone repairs the file by hand.

**What we should do.** Write the new contents to `tasks.json.tmp`, then rename that file over `tasks.json`. On startup, if the JSON does not parse, stop with a clear message.

**Why.** A rename on the same disk swaps the file in one step. A reader sees either the old file or the new file.

### 5. Create and update use different title rules (medium)

`POST /tasks` accepts a title like `"a"`. `PATCH` rejects that same title as too short. A title that is only spaces also gets a different error on update than on create. You can create a task that you can never save again. The docs never say how long a title must be.

**What we should do.** Use one title rule in `taskValidator.js` for both endpoints: trim it, reject an empty result, and use the same min and max length. Call that validator from both handlers. Write the numbers in the endpoint docs.

**Why.** One function means one rule. Clients can read the limit instead of discovering it by getting a 400.

### 6. The same checks are written three times (medium)

The controller has its own checks, the service has another set, and `taskValidator.js` has a third. The validator is the clean one: it rejects unknown fields and returns a normalized object. The three copies use different error messages, so a rule change has to be made in all of them.

**What we should do.** Call `validateCreateTask` and `validateUpdateTask` from the controller. Delete the inline checks. Keep validation out of the service. Reject unknown fields, which is what the validator does.

**Why.** The overwritten-field bug and the mismatched title rules both come from having three copies. Dead validator code also makes it look like the protection is there when the request never reaches it.

### 7. The controller builds its own error responses (medium)

Every bad task body does `return res.status(400).json(...)`. The app already has `HttpError` and `errorHandler` for this. The error shape now lives in two places, and `details` never gets filled in.

**What we should do.** Throw `new HttpError(400, ...)` from the validator and let `asyncHandler` plus `errorHandler` send the response.

**Why.** One error path means a later change, such as request ids or logging, happens once.

### 8. The data folder depends on the folder you start the server from (medium)

`tasks.service.js` builds the path with `process.cwd()`. Start the server from the repo root, or from a process manager that uses another working directory, and it looks for `data/` in the wrong place. Writes then fail, or the API quietly uses some other empty `data/` folder.

**What we should do.** Resolve the folder once in a small `config.js`. Use `process.env.DATA_DIR` when it is set, otherwise the `data` folder next to `src`. Import that path in the tasks service, and create the folder when the server starts.

**Why.** The file location should follow the code, not whichever folder the shell was in. The env var still lets a deploy put the files somewhere else.

### 9. The controller edits the request body (medium)

The controller trims `title` and sets `completed = false` on `req.body` itself. Anything later in the chain that wants the original payload, such as a log or an error report, sees the edited version. Tests also get unstable inputs.

**What we should do.** Let the validator return a new object and pass that to the service. Leave `req.body` alone.

**Why.** The original body is what the client sent. A separate object keeps that record stable.

### 10. Every request reads the whole tasks file (medium)

`getAllTasks` and `getTaskById` both parse the entire file. Loading one task still reads every task.

**What we should do.** Leave the file read as it is while the list stays small. If reads get heavy, keep the list in memory and update that copy on each write.

**Why.** Paging is extra API for a short list the current clients already load in full. A memory copy is the smaller change once the file is actually hot. The activity log is the list that grows, so a limit belongs there first.

### 11. A title can be as large as the whole request body (medium)

`title` has no max length. One request can store up to about 100 kB in that field.

**What we should do.** In `taskValidator.js`, reject a title longer than 200 characters. Return 400 and name the field in `details`. Write that number in the endpoint docs.

**Why.** The limit belongs in the validator, so create and update pick it up together. 200 characters is enough for a task title, and the frontend can rely on the same number.

### 12. Saving a task does not write an activity entry (medium)

The tasks service never talks to the activity module. The log changes only if the client sends a second request to `POST /activity`. If that call fails or is skipped, the feed is wrong, and so is any report that counts recent activity.

**What we should do.** After a task is created, updated, or deleted, record `task.created`, `task.updated`, or `task.deleted` through the activity service. Run that write on the same queue as the task write. Keep `POST /activity` working for clients that already call it.

**Why.** The server is the one that knows the change really happened. If each client has to log it, every client reimplements the same call, and a failed second request looks like nothing changed.

---

## Activity module

### 1. Two entries can get the same id (high)

The id is `String(Date.now())`. Two creates in the same millisecond share an id. A burst of 15 requests left 20 rows and only 14 different ids.

**What we should do.** Use `createId()` from `utils/id.js`. It uses `crypto.randomUUID`.

**Why.** Tasks already uses this helper. Old numeric ids can stay in the file, because the field is a string either way. A random id is also hard to guess. A timestamp is not.

### 2. POST /activity saves whatever you send (high)

Nothing checks the body. `{}` becomes a row with only `id` and `when`. An object in `action` or a number in `info` is stored as sent. There is no length limit.

**What we should do.** Add an `activityValidator`, in the same style as the tasks one. `action` is required, trimmed, and not empty. `info` is an optional string. Cap `action` at 100 characters and `info` at 1000. Reject unknown fields. Call the validator from the controller and pass the clean object to the service.

**Why.** This file is a log. A bad shape breaks a frontend that expects `action` to be a string, and anyone can grow the file that `GET /activity` returns in full. One validator keeps the rules out of the service, the same way the tasks module should.

### 3. Activity file calls freeze the whole server (high)

Every activity request uses `existsSync`, `readFileSync`, and `writeFileSync`. Those run on the main thread. While one activity request touches the disk, tasks requests wait too. The file only gets bigger, so the pause gets longer.

**What we should do.** Read and write with `readJsonArray` and `writeJsonArray`. Make the service functions async, and wrap the routes with `asyncHandler`.

**Why.** Tasks already has an async store for this job. Using it removes the freeze, and the activity module then gets the write queue and the safe rename once those are added to `jsonStore`.

### 4. Activity repeats work the tasks module already shares (medium)

Tasks uses `asyncHandler`, `HttpError`, `jsonStore`, and `createId`. Activity uses none of them. `loadDataA` and `loadDataB` are the same function copied twice. The activity write also skips the trailing newline the shared store adds, so the two files are formatted differently.

**What we should do.** Make activity follow the tasks shape: route, controller wrapped in `asyncHandler`, service using `jsonStore` and `createId`, and a validator for the body. Delete `loadDataB`.

**Why.** This one change is what removes the duplicate ids, the missing checks, and the blocking reads. Two loaders will drift apart. One store means one set of file rules.

### 5. The activity file path also follows the start folder (medium)

`activity.service.js` uses `path.join(process.cwd(), 'data', 'activity.json')`, the same pattern as tasks.

**What we should do.** Import the data path from the same `config.js` the tasks service uses.

**Why.** Both files should move together. If the server starts in the wrong folder, both modules fail at startup instead of writing into two different places.

### 6. GET /activity returns the whole log, oldest first (medium)

There is no `limit`, `offset`, or `since`. The client downloads every entry to show the latest few.

**What we should do.** Accept an optional `limit`, with a maximum we enforce. Return the newest entries first. When the client sends no `limit`, keep today's full oldest-first list.

**Why.** The log only grows, so the response has to have a cap. Newest first matches a feed. Keeping the old default means current clients keep working.

### 7. The activity response does not look like a task response (medium)

Tasks return `{ data: ... }`, with `createdAt`, `updatedAt`, and UUID ids. Activity returns the raw array or object, uses `when`, and uses numeric string ids.

**What we should do.** Leave the current activity responses as they are, and write them down as the old shape. New endpoints should use `{ data }` and `createdAt`. Plan a versioned change before activity moves over.

**Why.** Clients already handle activity as a special case. Changing the shape now would break them. Writing the old shape down stops the next endpoint from copying it by accident.

### 8. The names are hard to read (low)

The code uses `c`, `aSvc`, `x`, `made`, `b`, `one`, `fp`, `loadDataA`, `loadDataB`, and `get_activity`.

**What we should do.** Rename them in the same rewrite: `activityController`, `activityService`, `listActivity`, `createActivity`, `ACTIVITY_FILE_PATH`, `payload`, `entry`.

**Why.** That rewrite already touches these lines. Clear names mean the next reader can see what a variable is without opening the function. Doing it in the same change avoids a second noisy diff.

---

## Other backend issues

These sit outside both modules. They still affect tasks and activity.

### The error handler sends parser text to the client (medium)

Any error with a 4xx status sends its raw message. Broken JSON comes back as a V8 message like `Expected property name or '}' in JSON at position 1`.

**What we should do.** Send `message` only when the error is an `HttpError`. Map body-parser failures to a plain 400, and a too-large body to a plain 413. Use a generic message for everything else.

**Why.** The engine text changes between Node versions and tells the client nothing useful. Our own `HttpError` messages are the ones we chose to show.

### No tests, no lint, and no Node version (low)

`package.json` has no `test` or `lint` script, no `engines`, and no dev dependencies. The code needs Node 18 for `node --watch`. The wrong version fails in a confusing way.

**What we should do.** Set `"engines": { "node": ">=18" }`. Add ESLint and Prettier. Add a `node:test` suite that hits each endpoint and the errors we document.

**Why.** The overwritten-field bug and the duplicate activity ids would have failed a small test suite before anyone shipped them.

### The server stops in the middle of a write (low)

`SIGTERM` and `SIGINT` kill the process immediately. There is no `/health` endpoint, no request log, and no handler for unhandled rejections.

**What we should do.** Keep the server returned by `app.listen`. On `SIGTERM`, call `server.close()` so in-flight writes can finish. Add `GET /health` and a small request logger.

**Why.** Closing cleanly is what makes the temp-file rename in the tasks section actually work during a deploy. A health check gives the frontend and a process manager something to call.

### `createId` still has a weak fallback (low)

`utils/id.js` falls back to `Date.now()` plus `Math.random()` when `crypto.randomUUID` is missing. Every Node version this app can run already has `randomUUID`, so that branch never runs. If it did, the ids would collide the same way activity ids do today.

**What we should do.** Export `randomUUID` directly and delete the fallback.

**Why.** A fallback that can collide is worse than a clear crash on a Node version we do not support.

### The docs and the server disagree (low)

`frontend/docs/backend-endpoints.md` says port `4000`. The README, `frontend/.env.example`, and `server.js` say `3000`. The docs also describe an `in-progress` status, while a task only has a boolean `completed`.

**What we should do.** Change the docs to port `3000`. Write down that reports cannot count an `in-progress` bucket until the model has a real status field.

**Why.** Anyone following the endpoint doc calls the wrong port. A status the model does not have will be hardcoded as `0` in reports.

### Live data is committed, and `.env` is not ignored (low)

`backend/data/*.json` is tracked. `.gitignore` only ignores `node_modules/` and `*.log`.

**What we should do.** Keep seed files in git, ignore the live data files, and add `.env*` to `.gitignore`.

**Why.** Every local run dirties the git status with data changes. A future `.env` with secrets would be committed by default.

### The API has no hardening (low)

`app.js` has no `helmet`, no rate limit, no CORS allow-list, and no auth. The Next.js app calls the API from the server, so browser CORS is not needed today. The API is still open to anything on the same network.

**What we should do.** Add `helmet`, a basic rate limit on the write routes, and an explicit CORS allow-list. Write down that this API should sit behind the Next.js proxy or an auth layer.

**Why.** This is low only because the project is an assessment sandbox. On a real network, open writes would be a high-priority problem.
