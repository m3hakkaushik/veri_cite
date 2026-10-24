import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | undefined;

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

/** Trusted BFF writes only. Authorize the caller before using this client. */
export function createServiceSupabase(): SupabaseClient {
  serviceClient ??= createClient(
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return serviceClient;
}

/** Request-scoped reads through Clerk third-party auth and database RLS. */
export async function createUserSupabase(): Promise<SupabaseClient> {
  const session = await auth();
  if (!session.userId) throw new Error("Authentication required");
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    {
      accessToken: async () => session.getToken(),
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
