import { createBrowserClient } from "@supabase/ssr";

// Browser client — only used for the sign-in button and phase 4's push
// subscription registration. All card data reads/writes go through Server
// Actions, never directly from the client.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
