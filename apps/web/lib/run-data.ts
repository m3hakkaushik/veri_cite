import "server-only";

import { ApiError } from "@/lib/api";
import { createUserSupabase } from "@/lib/supabase/server";
import { toCitation, toRun } from "@/lib/to-api";

export async function readRun(id: string) {
  const db = await createUserSupabase();
  const { data: run, error } = await db
    .from("runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new ApiError(
      "database_unavailable",
      "Could not load the report.",
      503,
    );
  if (!run) throw new ApiError("not_found", "Report not found.", 404);
  const { data: citations, error: childError } = await db
    .from("citations")
    .select("*,claims(*),evidence(*)")
    .eq("run_id", id)
    .order("idx");
  if (childError)
    throw new ApiError(
      "database_unavailable",
      "Could not load the evidence.",
      503,
    );
  return { run: toRun(run), citations: (citations ?? []).map(toCitation) };
}
