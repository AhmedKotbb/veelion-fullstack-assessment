import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <header className="stack section-gap">
        <h1 className="heading">VeeLion Frontend Assessment</h1>
        <p className="message muted">Two separate modules built against the provided backend.</p>
      </header>

      <section className="stack home-grid">
        <Link href="/tasks" className="card home-card">
          <h2>Task Dashboard</h2>
          <p className="message muted">Create tasks and move them between to do, in progress, and done.</p>
        </Link>

        <Link href="/activity" className="card home-card">
          <h2>Activity Feed</h2>
          <p className="message muted">Search recent activity and load the latest entries.</p>
        </Link>
      </section>
    </main>
  );
}
