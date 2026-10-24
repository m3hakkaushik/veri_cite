import Link from "next/link";
import { Logo } from "@/components/logo";
import { TrustReport } from "@/components/trust-report";
import { createServiceSupabase } from "@/lib/supabase/server";
import { toCitation, toRun } from "@/lib/to-api";

export default async function DemoPage() {
  const db = createServiceSupabase();
  const { data: run, error } = await db
    .from("runs")
    .select("*")
    .eq("is_sample", true)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();
  if (error || !run)
    return (
      <main id="main" className="auth-screen">
        <Logo />
        <h1>The sample report is being prepared.</h1>
        <p>You can start with your own bibliography.</p>
        <Link className="desk-primary" href="/app/new">
          Check references
        </Link>
      </main>
    );
  const { data: citations, error: childError } = await db
    .from("citations")
    .select("*,claims(*),evidence(*)")
    .eq("run_id", run.id)
    .order("idx");
  if (childError) throw new Error("Could not load sample evidence");
  return (
    <TrustReport
      initial={{
        run: toRun(run),
        citations: (citations ?? []).map(toCitation),
      }}
      live={false}
    />
  );
}
