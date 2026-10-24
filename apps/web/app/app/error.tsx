"use client";
import Link from "next/link";
export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="auth-screen">
      <h1>Could not open this workspace</h1>
      <p>Please try again.</p>
      <button className="desk-primary" onClick={reset}>
        Try again
      </button>
      <Link href="/app/new">Start a new check</Link>
    </main>
  );
}
