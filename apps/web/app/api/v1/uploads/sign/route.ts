import { z } from "zod";
import { randomUUID } from "node:crypto";
import { api, ApiError, requireUser } from "@/lib/api";
import { createServiceSupabase } from "@/lib/supabase/server";

const bodySchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string(),
  size: z.number().int().positive(),
});
export async function POST(request: Request) {
  return api(async () => {
    const owner = await requireUser();
    const { filename, contentType, size } = bodySchema.parse(
      await request.json(),
    );
    const pdf = /\.pdf$/i.test(filename),
      bib = /\.bib$/i.test(filename);
    if (
      (!pdf && !bib) ||
      (pdf && contentType !== "application/pdf") ||
      (bib && !["text/plain", "text/x-bibtex"].includes(contentType))
    )
      throw new ApiError("invalid_file", "Choose a PDF or BibTeX file.");
    if (size > (pdf ? 20 : 2) * 1024 * 1024)
      throw new ApiError(
        "file_too_large",
        `Choose a file under ${pdf ? 20 : 2} MB.`,
      );
    const name = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    const storagePath = `${owner}/${randomUUID()}/${name}`;
    const { data, error } = await createServiceSupabase()
      .storage.from("uploads")
      .createSignedUploadUrl(storagePath);
    if (error || !data)
      throw new ApiError(
        "storage_unavailable",
        "Could not prepare the upload.",
        503,
      );
    return Response.json({
      uploadUrl: data.signedUrl,
      token: data.token,
      storagePath,
    });
  });
}
