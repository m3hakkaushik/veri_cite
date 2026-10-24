import "server-only";

import { createHmac } from "node:crypto";
import { ApiError } from "@/lib/api";

export async function callWorker(path: string, body: object) {
  const secret = process.env.WORKER_SHARED_SECRET;
  const base = process.env.WORKER_URL;
  if (!base || !secret)
    throw new ApiError(
      "worker_unavailable",
      "The checking service is not configured.",
      503,
    );
  const rawBody = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const response = await fetch(new URL(path, base), {
    method: "POST",
    body: rawBody,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "Content-Type": "application/json",
      "X-VeriCite-Timestamp": timestamp,
      "X-VeriCite-Signature": signature,
    },
  });
  if (!response.ok)
    throw new ApiError(
      "worker_unavailable",
      "The checking service could not start this run.",
      503,
    );
  return response;
}
