import { z } from "zod";
import { api, ApiError, ensureUser, limitRuns, requireUser } from "@/lib/api";
import {
  createServiceSupabase,
  createUserSupabase,
} from "@/lib/supabase/server";
import { toRun } from "@/lib/to-api";
import { callWorker } from "@/lib/worker";

const input = z.object({
  inputType: z.enum(["text", "pdf", "bib"]),
  title: z.string().trim().max(200).optional(),
  text: z.string().max(60_000).optional(),
  storagePath: z.string().max(400).optional(),
  options: z
    .object({
      checks: z.array(
        z.enum(["existence", "support", "integrity", "currency"]),
      ),
      recencyMinutes: z.number().int().min(1).max(5_256_000).optional(),
    })
    .optional(),
});
export async function POST(request: Request) {
  return api(async () => {
    const owner = await requireUser();
    const body = input.parse(await request.json());
    if (
      body.inputType === "text"
        ? !body.text?.trim()
        : !body.storagePath?.startsWith(`${owner}/`)
    )
      throw new ApiError(
        "invalid_input",
        "Add text or upload your document first.",
      );
    if (
      body.storagePath &&
      (body.storagePath.includes("..") ||
        body.storagePath.split("/").length !== 3 ||
        !body.storagePath.toLowerCase().endsWith(`.${body.inputType}`))
    )
      throw new ApiError("invalid_path", "Upload your document again.");
    limitRuns(owner);
    await ensureUser(owner);
    const db = createServiceSupabase();
    const { data: run, error } = await db
      .from("runs")
      .insert({
        // The signed-upload folder reserves this run's UUID before file transfer.
        id:
          body.inputType !== "text"
            ? z.string().uuid().parse(body.storagePath?.split("/")[1])
            : undefined,
        owner_id: owner,
        title:
          body.title ||
          (body.inputType === "text" ? "Pasted references" : "Untitled"),
        input_type: body.inputType,
        source_text: body.inputType === "text" ? body.text : null,
        source_storage_path:
          body.inputType !== "text" ? body.storagePath : null,
        options: {
          checks: Array.from(
            new Set([
              "existence",
              ...(body.options?.checks ?? ["support", "integrity"]),
            ]),
          ),
          recency_minutes: body.options?.recencyMinutes ?? 10080,
        },
      })
      .select()
      .single();
    if (error || !run)
      throw new ApiError(
        "database_unavailable",
        "Could not create the check.",
        503,
      );
    try {
      await callWorker(`/internal/runs/${run.id}/start`, {});
    } catch {
      await db
        .from("runs")
        .update({
          status: "failed",
          error: "The checking service could not start this run.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
      throw new ApiError(
        "worker_unavailable",
        "Could not start the check. Please try again.",
        503,
      );
    }
    return Response.json({ run: toRun(run) }, { status: 201 });
  });
}
export async function GET(request: Request) {
  return api(async () => {
    const owner = await requireUser();
    const url = new URL(request.url);
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .parse(url.searchParams.get("limit") ?? 20);
    const db = await createUserSupabase();
    let query = db
      .from("runs")
      .select("*")
      .eq("owner_id", owner)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);
    const cursor = url.searchParams.get("cursor");
    if (cursor) {
      if (cursor.length > 512)
        throw new ApiError("invalid_cursor", "Invalid history cursor.");
      const decoded = z
        .object({ at: z.iso.datetime({ offset: true }), id: z.string().uuid() })
        .parse(JSON.parse(Buffer.from(cursor, "base64url").toString()));
      query = query.or(
        `created_at.lt.${decoded.at},and(created_at.eq.${decoded.at},id.lt.${decoded.id})`,
      );
    }
    const { data, error } = await query;
    if (error)
      throw new ApiError(
        "database_unavailable",
        "Could not load your history.",
        503,
      );
    const rows = (data ?? []).slice(0, limit),
      last = rows.at(-1);
    return Response.json({
      runs: rows.map(toRun),
      nextCursor:
        (data?.length ?? 0) > limit && last
          ? Buffer.from(
              JSON.stringify({ at: last.created_at, id: last.id }),
            ).toString("base64url")
          : null,
    });
  });
}
