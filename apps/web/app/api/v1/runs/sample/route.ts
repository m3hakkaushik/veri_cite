import { randomUUID } from "node:crypto";
import { api, ApiError, ensureUser, limitRuns, requireUser } from "@/lib/api";
import { createServiceSupabase } from "@/lib/supabase/server";
import { toRun } from "@/lib/to-api";
import { callWorker } from "@/lib/worker";

export async function POST() {
  return api(async () => {
    const owner = await requireUser();
    const db = createServiceSupabase();
    const { data: sample, error } = await db
      .from("runs")
      .select("*")
      .eq("is_sample", true)
      .eq("status", "completed")
      .limit(1)
      .maybeSingle();
    if (error)
      throw new ApiError(
        "database_unavailable",
        "Could not load the sample.",
        503,
      );
    if (!sample)
      throw new ApiError(
        "not_found",
        "The sample paper is not available yet.",
        404,
      );
    limitRuns(owner);
    await ensureUser(owner);
    const id = randomUUID();
    let path = null;
    if (sample.source_storage_path) {
      path = `${owner}/${id}/${sample.source_storage_path.split("/").at(-1)}`;
      const { error: copyError } = await db.storage
        .from("uploads")
        .copy(sample.source_storage_path, path);
      if (copyError)
        throw new ApiError(
          "storage_unavailable",
          "Could not prepare the sample.",
          503,
        );
    }
    const { data: run, error: insertError } = await db
      .from("runs")
      .insert({
        id,
        owner_id: owner,
        title: sample.title,
        input_type: sample.input_type,
        source_text: sample.source_text,
        source_storage_path: path,
        source_url: sample.source_url,
        options: sample.options,
      })
      .select()
      .single();
    if (insertError || !run)
      throw new ApiError(
        "database_unavailable",
        "Could not create the check.",
        503,
      );
    try {
      await callWorker(`/internal/runs/${id}/start`, {});
    } catch {
      await db
        .from("runs")
        .update({
          status: "failed",
          error: "The checking service could not start this run.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id);
      throw new ApiError(
        "worker_unavailable",
        "Could not start the sample check.",
        503,
      );
    }
    return Response.json({ run: toRun(run) }, { status: 201 });
  });
}
