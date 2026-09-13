import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="tag">Department of Information Technology</div>
        <h1 className="title">NEXOVERSE<span className="accent">'26</span></h1>
        <h2>LOGO HUNT</h2>
        <p className="muted">Think Fast. Buzz First. Win Big.</p>
        <div className="actions">
          <Link className="btn primary" href="/join">Join as Participant</Link>
          <Link className="btn" href="/organiser/login">Organiser Access</Link>
        </div>
      </section>
    </main>
  );
}
