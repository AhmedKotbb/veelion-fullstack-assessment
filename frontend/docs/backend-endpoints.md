# Backend API Endpoints

Base URL: `http://localhost:3000`

## Access

This API does not check who is calling. Put it behind the Next.js proxy (`frontend/app/api`) or behind an auth layer before it is reachable from a network.

Browsers cannot call it unless `CORS_ORIGINS` lists their origin (comma-separated). The Next.js app calls the API from the server, so it does not need an entry. `POST`, `PUT`, `PATCH`, and `DELETE` allow 60 requests per minute per connecting address. A JSON body larger than 100kb is rejected.

## Shared Error Shape

```ts
type ErrorResponse = {
  error: {
    message: string;
  };
};
```

These apply to every route:

- `400` with message `Invalid JSON` when the body is not valid JSON. The parser's own text is not returned.
- `400` with message `Invalid request body` for other body-parser failures, such as an unsupported charset.
- `413` with message `Request body is too large` when the body is over 100kb.
- `429` with message `Too many requests` when a write route is called more than 60 times in a minute.
- `500` with message `Internal server error` for unexpected failures. The server log has the real error.

Messages from our own validation are returned as written. Anything else is replaced with one of the messages above.

## Task Endpoints

### GET /tasks

Fetch all tasks.

```ts
type TaskStatus = "todo" | "in-progress" | "done";

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
};

type GetTasksResponse = {
  data: Task[];
};
```

### GET /tasks/:id

Fetch one task by ID.

```ts
type GetTaskResponse = {
  data: Task;
};
```

Possible errors:
- `404` when task does not exist.

### POST /tasks

Create a task.

```ts
type CreateTaskRequest = {
  title: string; // required, trimmed, 4–200 characters
  status?: TaskStatus; // default "todo"
};

type CreateTaskResponse = {
  data: Task;
};
```

Possible errors:
- `400` when body is not an object.
- `400` when title is missing, not a string, empty, or outside 4–200 characters.
- `400` when status is present but is not `todo`, `in-progress`, or `done`.

### PATCH /tasks/:id

Update task title or status.

```ts
type PatchTaskRequest = {
  title?: string; // if provided, trimmed, 4–200 characters
  status?: TaskStatus; // only an adjacent move: todo <-> in-progress <-> done
};

type PatchTaskResponse = {
  data: Task;
};
```

Possible errors:
- `400` when body is invalid.
- `400` when no supported fields are provided.
- `400` when status is present but is not `todo`, `in-progress`, or `done`.
- `400` when status skips a step, stays the same, or otherwise is not an adjacent move (`todo` ↔ `in-progress` ↔ `done`).
- `404` when task does not exist.

### DELETE /tasks/:id

Delete task by ID.

```ts
type DeleteTaskResponse = void; // status 204
```

Possible errors:
- `404` when task does not exist.

## Activity Endpoints

This is the legacy activity shape. Current clients depend on it, so these two routes stay as they are.

```ts
type ActivityLog = {
  id: string; // UUID for new rows; older rows may still be a numeric string
  action?: string;
  info?: string;
  when: string; // ISO datetime. Tasks use createdAt; activity still uses when.
};

type GetActivityResponse = ActivityLog[]; // raw array, not { data: ActivityLog[] }
type CreateActivityResponse = ActivityLog; // raw object, not { data: ActivityLog }
```

New endpoints should return `{ data }` and use `createdAt`. Do not copy `when` or the unwrapped body. Moving activity itself onto that shape needs a versioned path first, so the clients of `GET /activity` and `POST /activity` keep working.

### GET /activity

Fetch activity logs.

With no query, the response is the full log, oldest first.

```ts
type GetActivityQuery = {
  limit?: number; // optional, integer, 1–100
};
```

When `limit` is set, the response contains at most that many entries, newest first. A limit above 100 is rejected. The stored file stays oldest first either way.

Possible errors:
- `400` when `limit` is present but is not an integer from 1 to 100.

### POST /activity

Create activity log entry.

```ts
type CreateActivityRequest = {
  action: string; // required, trimmed, 1–100 characters
  info?: string; // optional, trimmed, at most 1000 characters
};
```

Possible errors:
- `400` when body is not an object.
- `400` when `action` is missing, not a string, empty, or longer than 100 characters.
- `400` when `info` is present but not a string, or longer than 1000 characters.
- `400` when the body contains unsupported fields.

## Reports Endpoints

### GET /reports/tasks-summary

Fetch summary statistics for tasks and activity. No query string and no body.

This response is the raw summary object. It does not use the `{ data }` wrapper. That wrapper is for other new endpoints that return a task or an activity row.

```ts
type TasksSummary = {
  total: number;
  byStatus: {
    todo: number;
    "in-progress": number;
    done: number;
  };
  recentActivityCount: number;
};

type GetTasksSummaryResponse = TasksSummary;
```

Example:

```json
{
  "total": 20,
  "byStatus": { "todo": 5, "in-progress": 10, "done": 5 },
  "recentActivityCount": 12
}
```

Notes:
- `total` is the number of tasks in the tasks file, including any task whose `status` is not one of the three keys below.
- `byStatus` always has `todo`, `in-progress`, and `done`. Each value is how many tasks have that `status`. A task with any other status is left out of these three counts.
- `recentActivityCount` is how many activity rows have a `when` timestamp inside the last 7 days (168 hours), measured from the time of the request. A row with a missing or unparseable `when` is not counted.
- Both files are read together. The response is built from those reads and is not stored.
