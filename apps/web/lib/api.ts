import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { createServiceSupabase } from "@/lib/supabase/server";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function requireUser() {
  const session = await auth();
  if (!session.userId)
    throw new ApiError("unauthorized", "Sign in to continue.", 401);
  return session.userId;
}

export async function ensureUser(userId: string) {
  const user = await currentUser();
  if (!user || user.id !== userId)
    throw new ApiError("unauthorized", "Sign in to continue.", 401);
  const { error } = await createServiceSupabase()
    .from("users")
    .upsert({
      id: userId,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      name: user.fullName ?? user.username ?? null,
    });
  if (error)
    throw new ApiError(
      "database_unavailable",
      "Could not open your workspace.",
      503,
    );
}

const windows = new Map<string, { used: number; reset: number }>();
export function limitRuns(userId: string) {
  const now = Date.now();
  for (const [key, entry] of windows)
    if (entry.reset <= now) windows.delete(key);
  const entry = windows.get(userId) ?? { used: 0, reset: now + 3_600_000 };
  if (entry.used >= 10)
    throw new ApiError(
      "rate_limited",
      "You can start 10 checks per hour. Try again later.",
      429,
    );
  entry.used++;
  windows.set(userId, entry);
}

export async function api(action: () => Promise<Response>) {
  try {
    const response = await action();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json(
        {
          error: {
            code: "invalid_input",
            message: "Check the input and try again.",
          },
        },
        { status: 400 },
      );
    if (error instanceof SyntaxError)
      return Response.json(
        { error: { code: "invalid_json", message: "Send a valid JSON body." } },
        { status: 400 },
      );
    if (error instanceof ApiError)
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    console.error(
      "API request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return Response.json(
      {
        error: {
          code: "service_unavailable",
          message: "Could not complete the request. Please try again.",
        },
      },
      { status: 503 },
    );
  }
}

export const uuid = z.string().uuid();
