import { api, ApiError, requireUser, uuid } from "@/lib/api";
import { createServiceSupabase } from "@/lib/supabase/server";
import { readRun } from "@/lib/run-data";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return api(async () => {
    await requireUser();
    return Response.json(await readRun(uuid.parse((await context.params).id)));
  });
}
export async function DELETE(_request: Request, context: Context) {
  return api(async () => {
    const owner = await requireUser(),
      id = uuid.parse((await context.params).id);
    const db = createServiceSupabase();
    const { data, error } = await db
      .from("runs")
      .select("id,source_storage_path")
      .eq("id", id)
      .eq("owner_id", owner)
      .maybeSingle();
    if (error)
      throw new ApiError(
        "database_unavailable",
        "Could not delete the report.",
        503,
      );
    if (!data) throw new ApiError("not_found", "Report not found.", 404);
    const { error: deleteError } = await db
      .from("runs")
      .delete()
      .eq("id", id)
      .eq("owner_id", owner);
    if (deleteError)
      throw new ApiError(
        "database_unavailable",
        "Could not delete the report.",
        503,
      );
    if (data.source_storage_path?.startsWith(`${owner}/`))
      await db.storage.from("uploads").remove([data.source_storage_path]);
    return new Response(null, { status: 204 });
  });
}
