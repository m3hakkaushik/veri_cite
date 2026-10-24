export async function GET() {
  let worker = false;
  try {
    const response = await fetch(
      new URL("/health", process.env.WORKER_URL || "http://localhost:8000"),
      { cache: "no-store", signal: AbortSignal.timeout(3000) },
    );
    worker = response.ok && (await response.json()).ok === true;
  } catch {
    /* Liveness is reported without exposing provider configuration. */
  }
  return Response.json({ ok: worker, worker }, { status: worker ? 200 : 503 });
}
