"use client";

import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";

/** Must be used under ClerkProvider. Reads/realtime use the current user's JWT. */
export function useSupabase() {
  const { session } = useSession();
  return useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey)
      throw new Error("Supabase browser configuration is missing");
    return createClient(url, anonKey, {
      accessToken: async () => session?.getToken() ?? null,
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }, [session]);
}
