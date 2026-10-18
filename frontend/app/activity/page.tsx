"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BoltIcon, CheckIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { requestJson } from "@/lib/apiClient";
import { formatTimestamp } from "@/lib/format";
import type { ActivityLog } from "@/types/api";

function sameActivity(left: ActivityLog[], right: ActivityLog[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => {
    const other = right[index];
    return (
      item.id === other.id &&
      item.action === other.action &&
      item.info === other.info &&
      item.when === other.when
    );
  });
}

function messageFrom(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not load activity.";
}

function filterActivity(items: ActivityLog[], text: string) {
  const query = text.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter(
    (item) =>
      (item.action || "").toLowerCase().includes(query) ||
      (item.info || "").toLowerCase().includes(query)
  );
}

function actionLabel(action?: string) {
  if (action === "task.created") {
    return "Task created";
  }

  if (action === "task.updated") {
    return "Task updated";
  }

  if (action === "task.deleted") {
    return "Task deleted";
  }

  const value = action?.trim();
  return value || "Activity";
}

function actionTone(action?: string) {
  if (action === "task.created") {
    return "created";
  }

  if (action === "task.updated") {
    return "updated";
  }

  if (action === "task.deleted") {
    return "deleted";
  }

  return "other";
}

function readableInfo(info?: string) {
  const trimmed = info?.trim();
  if (!trimmed) {
    return "No details";
  }

  const titled = trimmed.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s+(.+)$/i
  );
  return titled?.[1] || trimmed;
}

function ActivityIcon({ action }: { action?: string }) {
  const tone = actionTone(action);

  if (tone === "created") {
    return <PlusIcon size={16} />;
  }

  if (tone === "updated") {
    return <PencilIcon size={16} />;
  }

  if (tone === "deleted") {
    return <TrashIcon size={16} />;
  }

  return <BoltIcon size={16} />;
}

export default function ActivityPage() {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await requestJson<ActivityLog[]>("/api/activity");

      if (!Array.isArray(data)) {
        setActivity([]);
        setError("Activity response was not a list.");
        return;
      }

      setActivity((current) => (sameActivity(current, data) ? current : data));
      setError("");
    } catch (caught) {
      setActivity([]);
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const visibleActivity = useMemo(() => filterActivity(activity, query), [activity, query]);

  return (
    <main className="page">
      <header className="page-heading">
        <div>
          <h1>Activity</h1>
          <p className="muted">Search recent updates and refresh the feed.</p>
        </div>
      </header>

      <section className="toolbar">
        <input
          className="input"
          placeholder="Search activity"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search activity"
        />
        <button type="button" className="button primary" onClick={() => void loadActivity()} disabled={loading}>
          Sync
        </button>
      </section>

      {loading ? (
        <section className="panel">
          <p role="status" className="message">
            Loading activity...
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="panel error">
          <p role="alert" className="alert-block">
            {error}
          </p>
          <button type="button" className="button" onClick={() => void loadActivity()}>
            Retry
          </button>
        </section>
      ) : null}

      {!loading && !error ? (
        <>
          <section className="stats stats-compact" aria-label="Activity summary">
            <article className="stat-card">
              <div>
                <p className="stat-label">Entries</p>
                <p className="stat-value">{activity.length}</p>
              </div>
            </article>
            <article className="stat-card">
              <div>
                <p className="stat-label">Showing</p>
                <p className="stat-value">{visibleActivity.length}</p>
              </div>
            </article>
          </section>

          {activity.length === 0 ? (
            <section className="panel">
              <p className="message muted">No activity yet</p>
            </section>
          ) : visibleActivity.length === 0 ? (
            <section className="panel">
              <p className="message muted">No activity matches your search</p>
            </section>
          ) : (
            <ul className="activity-list">
              {visibleActivity.map((item) => (
                <li key={item.id} className="activity-card">
                  <span className={`activity-mark ${actionTone(item.action)}`}>
                    <ActivityIcon action={item.action} />
                  </span>
                  <div className="activity-body">
                    <div className="activity-row">
                      <span className="activity-action">{actionLabel(item.action)}</span>
                      <time className="activity-time" dateTime={item.when}>
                        {formatTimestamp(item.when)}
                      </time>
                    </div>
                    <p className="activity-info">{readableInfo(item.info)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </main>
  );
}
