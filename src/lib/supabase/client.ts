import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export const isSupabaseConfigured = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes("your-project") &&
      !supabaseAnonKey.includes("your-anon-key") &&
      !supabaseAnonKey.includes("placeholder")
  );
};

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isSupabaseConfigured()) {
    // Return standard client with dummy URL to prevent runtime crash in guest mode
    return createBrowserClient<Database>(
      "https://placeholder.supabase.co",
      "placeholder-anon-key"
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!);
  }

  return browserClient;
}
