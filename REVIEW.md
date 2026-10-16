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


### `createId` still has a weak fallback (low)

`utils/id.js` falls back to `Date.now()` plus `Math.random()` when `crypto.randomUUID` is missing. Every Node version this app can run already has `randomUUID`, so that branch never runs. If it did, the ids would collide the same way activity ids do today.

**What we should do.** Export `randomUUID` directly and delete the fallback.

**Why.** A fallback that can collide is worse than a clear crash on a Node version we do not support.

### The API has no hardening (low)

`app.js` has no `helmet`, no rate limit, no CORS allow-list, and no auth. The Next.js app calls the API from the server, so browser CORS is not needed today. The API is still open to anything on the same network.

**What we should do.** Add `helmet`, a basic rate limit on the write routes, and an explicit CORS allow-list. Write down that this API should sit behind the Next.js proxy or an auth layer.

**Why.** This is low only because the project is an assessment sandbox. On a real network, open writes would be a high-priority problem.


# Frontend

Task Dashboard issues are listed first, then the Activity Feed, then things that touch the whole app. Each item says what is wrong, what we should change, and why that change is the right one.

---

## Task Dashboard

### 1. The dashboard still uses `completed`, but tasks now have `status` (high)

as part of the improvement of the backend app i changed `completed`with `status` (`todo`, `in-progress`, `done`) and has no `completed` field. The frontend still reads and sends `completed` everywhere: in `types/api.ts`, `useTasks`, `TaskItem`, the PATCH proxy, and `updateTaskInBackend`. Because `task.completed` is always `undefined`, every task shows "Pending". The "Completed" filter is always empty. Clicking the button sends `{ completed: true }`, the backend rejects it because that field is not allowed, and the save fails every time.

**What we should do.** Change the `Task` type to use `status: TaskStatus`, the same as the endpoint docs. Show the real status on each task. Change the filter to All / To do / In progress / Done. Replace the single toggle with buttons that only offer the moves the backend accepts (`todo` to `in-progress`, `in-progress` to `done` or back). Send `{ status }` through the proxy, and check it there against the three allowed values.

**Why.** Right now the main action on the page cannot work, and the list gives the wrong state for every task. The type is the one place all of this comes from, so once it matches the API, TypeScript points to every other line that needs to change.

### 2. A failed save hides the whole task list (high)

`useTasks` uses one `error` state for both loading and saving. `TaskDashboard` only shows the list when `!loading && !error`. So when one toggle fails, every task disappears and the page shows a big error box with a "Retry" button. That button reloads all the tasks instead of retrying the save. With the bug above, this happens on every click.

**What we should do.** Use two separate states, `loadError` and `updateError`. Keep the list on screen when a save fails. Show the save error next to that task, or as a small message above the list, and leave the task as it was.

**Why.** A failed save on one task should not take the other tasks away. Loading the page and saving one task are two separate actions, and each needs its own error message.

### 3. The proxy turns every backend error into a 500 (medium)

`app/api/tasks/[id]/route.ts` and `app/api/tasks/route.ts` catch every error and return status 500. A 404 for a missing task, a 400 for a bad status, and a 429 rate limit all reach the browser as 500. Broken JSON in the PATCH body makes `request.json()` throw, so that also becomes a 500 instead of a 400.

**What we should do.** In `backendApi.ts`, throw a small `ApiError` that keeps the backend status code and message. In the route handlers, send that same status back. Use 502 only when the backend cannot be reached. Wrap `request.json()` and return 400 when the body cannot be read.

**Why.** The status code tells the client what to do next. A 404 means reload the list, a 400 means fix the input, and a 500 means try again later. If everything is a 500, the UI cannot tell these cases apart, and our logs show server errors that are really client mistakes.

### 4. The task id goes into the URL without encoding (medium)

The hook builds `/api/tasks/${taskId}` and the proxy builds `${BACKEND_BASE_URL}/tasks/${taskId}`. Neither one encodes the id. Next.js decodes the `[id]` param, so an id that contains `?`, `#`, or `/` (sent as `%3F`, `%23`, `%2F`) changes which backend URL the proxy calls. With `../`, the request can reach a different backend route than `/tasks`.

**What we should do.** Wrap the id with `encodeURIComponent` in both places. In the proxy, also reject any id that does not look like a task id before calling the backend.

**Why.** The proxy is what the backend docs tell us to put in front of the API. It should only forward the requests it is meant to forward. Encoding the id is a one-line change and closes this hole.

### 5. Only one task can be "saving" at a time (medium)

`updatingTaskId` is a single string. If you click task A and then task B before A has finished, A's button turns back on while its request is still running, so you can click it twice. When A finishes, `finally` sets the id to `""`, and B looks finished even though it is still saving. The two responses can also come back in a different order than the clicks.

**What we should do.** Keep a `Set` of task ids that are saving. Add the id when the request starts, and remove only that id when it ends. Ignore clicks on a task that is already in the set.

**Why.** Each task needs its own busy state, because each one has its own request. This blocks the double click, and the busy buttons always match the requests that are really running.

### 6. The backend URL setting is public and the default port is wrong (medium)

`lib/constants.ts` reads `NEXT_PUBLIC_BACKEND_API_URL`. Next.js copies any `NEXT_PUBLIC_` value into the browser bundle as soon as a client component imports that file. The value is only meant for the server, because the proxy is the only code that should call the backend. The fallback is also `http://localhost:4000`, but the backend runs on port 3000. If `.env.local` is missing, every request fails with a vague `fetch failed`. The endpoint docs also still say `4000`.

**What we should do.** Rename the variable to `BACKEND_API_URL` with no `NEXT_PUBLIC_` prefix. Add `import "server-only"` to `backendApi.ts` and `constants.ts`. Change the default to `http://localhost:3000`, or fail at startup with a clear message when the value is missing. Fix the base URL in the docs.

**Why.** The browser should not know where the internal API lives, because the docs say it must sit behind the proxy. A wrong default makes a missing config look like the backend is down.

### 7. The fetch and error code is written three times (medium)

`useTasks` has its own `requestJson`. `backendApi.ts` has its own `parseError`. The activity page calls `fetch` directly and checks nothing. Each copy handles errors in its own way. Inside `requestJson`, the `throw` sits inside a `try`, so its own `catch` catches it and throws it again. That works by accident and is hard to follow. `backendApi.ts` wraps every call in a `try/catch` that only rebuilds the same error, which loses the original stack. `requestJson` also sends `Content-Type: application/json` on GET requests, and `useTasks` returns `tasks`, which nothing uses.

**What we should do.** Add one small client helper (for example `lib/apiClient.ts`) that calls our own `/api/*` routes, checks `response.ok`, reads the `{ error: { message } }` shape, and throws a typed error. Use it in both pages. In `backendApi.ts`, remove the `try/catch` blocks that only throw the error again. Only set `Content-Type` when there is a body.

**Why.** Error handling is where the bugs in this app come from: the activity crash, the 500s, and the hidden list. One helper means one set of rules, and the next page (Reports) gets the same rules without copying code.

### 8. Calls to the backend have no timeout (low)

The proxy calls `fetch` with no `AbortSignal`. If the backend hangs, the Next.js request hangs too, and the user sees "Loading tasks..." forever.

**What we should do.** Pass `signal: AbortSignal.timeout(5000)` (or a value we pick) to each backend call, and return 504 when it times out.

**Why.** A clear error after a few seconds is better than a spinner that never stops, and it frees the server for other requests.

### 9. Raw error text reaches the browser (low)

When the backend is down, the proxy sends back `error.message`, which is Node text like `fetch failed`. Users see that text in the error box.

**What we should do.** Send the backend's own `error.message` only when the backend answered with one. For network errors, log the real error on the server and send a plain message such as "Could not reach the server. Please try again."

**Why.** This is the same rule we use in the backend error handler: show the messages we chose to show, and keep internal text in the server log.

### 10. Tasks only start loading after the page runs in the browser (low)

`TaskDashboard` is a client component that fetches in `useEffect`. The browser downloads the page, runs React, then calls `/api/tasks`, which then calls the backend. The first thing the user sees is always "Loading tasks...".

**What we should do.** Load the tasks in `app/tasks/page.tsx`, which is a server component, by calling `getTasksFromBackend` directly. Pass them to `TaskDashboard` as the first value of the list. Keep the client code for filtering, saving, and retrying.

**Why.** This is how the App Router is designed to be used. It removes one network hop and the loading flash on first view, and the page keeps the same behavior after that.

### 11. Loading and errors are not announced to screen readers (low)

The "Loading tasks..." text and the error box are plain elements. A screen reader user gets no message when they appear.

**What we should do.** Add `role="status"` to the loading message and `role="alert"` to the error message.

**Why.** It is a two-attribute change, and it tells people using a screen reader what the sighted user can already see.

### 12. The filter resets on refresh (low)

The chosen filter only lives in React state. A refresh or a shared link always goes back to "All".

**What we should do.** Keep the filter in the URL, for example `/tasks?status=done`, and read it with `useSearchParams`.

**Why.** The URL is the normal place for view settings. Back and forward then work, and the link shows what the user was looking at.

---

## Activity Feed

### 1. The page crashes when the API returns an error (high)

The page calls `response.json()` and does not check `response.ok`. When the proxy returns 500, the body is `{ error: { message } }`. That object is not empty, so `data || []` keeps it, and it is saved as the activity list. The next render calls `forcedList.map` on an object, which throws, and the whole page goes to the Next.js error screen. This happens every time the backend is down.

**What we should do.** Check `response.ok` before reading the body. On an error, read the message and save it in an `error` state. Only save the list when the response is OK and the body is an array. Use the shared client helper from Task Dashboard item 7.

**Why.** One backend error should show a message, not crash the page. Checking `ok` and the array shape at the edge means the rest of the component can trust its data.

### 2. A timer re-renders the whole list every 1.4 seconds (high)

A `setInterval` changes `tick` every 1400 ms, forever. Every tick runs the filter again and builds a new `forcedList`, either as a copied array or with a copy of every item. React then re-renders every row, even when nothing has changed. The page fetches the full log, so this work grows with the log and keeps running while the tab sits open. `tick` does nothing useful. `stats.everySecondTick` is never shown.

**What we should do.** Remove `tick`, the interval, and `forcedList`. Render the filtered list directly. If we want the feed to stay fresh, poll `/api/activity` every 15 to 30 seconds and only update state when the data has really changed.

**Why.** The timer only creates work. Without it, React renders only when the data or the search text changes, which is what a feed needs.

### 3. There is no loading or error state (medium)

When the fetch fails because of a network error, `.catch` sets the list to `[]`. The user sees "Total: 0 | Visible: 0", as if there were no activity at all. While the request is running, the page shows the same empty list. The user cannot tell "loading", "failed", and "empty" apart.

**What we should do.** Add `loading` and `error` states, the same as the Task Dashboard. Show a loading message, an error with a Retry button, and a real empty message ("No activity yet").

**Why.** An empty list that is really a failure is worse than an error, because nobody knows to retry. The README also asks for loading and error states on new pages, so both pages should work the same way.

### 4. The same list is stored in three states (medium)

`allActivity`, `shownActivity`, and `forcedList` all hold copies of the same data. `shownActivity` is filled by a `useEffect` after every change, so each search keystroke renders twice: once with the old list and once with the new one. `stats` uses `useMemo` for two `.length` reads, which costs more than it saves. `applyFilterA` and `applyFilterB` are defined inside the component and used in an effect, but they are not in its dependency list, so the lint rule would flag them.

**What we should do.** Keep one `activity` state and one `query` state. Compute the visible list with `useMemo(() => filterActivity(activity, query), [activity, query])`. Move the filter and the date format functions outside the component. Read the counts directly from the two arrays.

**Why.** This is the "do not copy props or state into state" rule from the React docs. Values that can be computed from state should be computed while rendering, not synced in an effect. There is less code, fewer renders, and no copies that can get out of sync.

### 5. Every row shows its time twice, and the filter runs twice (medium)

`formatTimeA` and `formatTimeB` are the same function, and both are rendered on every row, so each time is shown twice with a `<br />` between them. `applyFilterA` and `applyFilterB` also do the same thing (one uses `includes`, the other uses `indexOf`), and the page runs the second one on the output of the first.

**What we should do.** Keep one `formatTime` and one `filterActivity`, and show the time once.

**Why.** The repeated time looks like a bug to users. The repeated filter does the same work twice. Two copies of one function will also drift apart when someone changes only one of them.

### 6. The feed loads the full log, oldest first (medium)

`getActivityFromBackend` calls `GET /activity` with no `limit`, so the browser downloads every entry ever written. The list shows the oldest entry at the top, which is the opposite of what a feed should do.

**What we should do.** Call `GET /activity?limit=50` from the proxy. The backend then returns the newest 50 entries first. If people need older entries, add a "Load more" button later.

**Why.** The log only grows, and the backend already supports `limit` for this reason. Newest first is what people expect from a feed. The search box only needs to cover recent entries.

### 7. Search shows nothing when nothing matches (low)

When the search matches no entries, the list is just blank. There is no message.

**What we should do.** Show "No activity matches your search", like the Task Dashboard does for its filter.

**Why.** A blank box looks like the page broke. A short message makes it clear the search worked and found nothing.

---

## Other frontend issues

These are not tied to one page. They still affect both.

### The pinned Next.js version has known security issues (high)

`package.json` pins `next` to `14.2.5`. `npm audit` reports critical and high advisories for it, including cache poisoning, denial of service through Server Components, and middleware auth bypass. It also flags a vulnerable `nanoid` that comes in as a dependency.

**What we should do.** Upgrade to the latest patched 14.2.x release first, because it fixes most of these without breaking changes. Run `npm audit` again, then plan the move to a supported major version as a separate change.

**Why.** This app is treated as production code. A patch upgrade inside the same minor version is low risk and closes known holes. A major upgrade changes APIs, such as async `params`, so it should be its own reviewed change.

### Inline styles and hard-coded colors everywhere (low)

Almost every element uses `style={{ ... }}`. The same padding and grid values are repeated in many files. The error box uses `#e3b4c0` and `#fff8fa` directly, even though `globals.css` already has color variables.

**What we should do.** Move the repeated styles into CSS classes, or CSS Modules for each component, such as `.card-body`, `.list`, and `.error-box`. Add the missing colors as variables in `:root`.

**Why.** The README asks for a UI pass. That pass is much easier when the styles live in one place, and a theme change becomes one edit instead of a search through every component.

### Page layout is repeated, and the home cards are empty (low)

Each page has its own `<main>` and its own "Back" link. There is no shared navigation, so adding the Reports page means copying it again. The two cards on the home page have only a title, with a blank line where a description used to be.

**What we should do.** Put a small header with links to Tasks, Activity, and Reports in `app/layout.tsx`. Remove the "Back" links. Give each home card one line that says what the page does.

**Why.** The layout is the App Router's place for UI that every page shares. A shared nav lets users move between pages directly instead of always going back home.

### No lint, no tests, and no Node version (low)

`package.json` has no `lint` or `test` script, no ESLint config, and no `engines`. Next.js 14 needs Node 18.17 or newer.

**What we should do.** Add `next lint` with the default Next.js ESLint config, and set `"engines": { "node": ">=18.17" }`. Add a few component tests with Vitest and React Testing Library for the task list, the filter, and the activity error state.

**Why.** The hooks lint rule would have flagged the activity effects. A test that renders the dashboard with real API data would have caught the `completed` versus `status` mismatch right away.