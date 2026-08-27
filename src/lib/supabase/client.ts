import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

// Default Supabase project configuration (anon key is frontend-safe & protected by RLS)
const DEFAULT_SUPABASE_URL = "https://jcwyubqwbrprqumfikbo.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjd3l1YnF3YnJwcnF1bWZpa2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTUxNjEsImV4cCI6MjEwMzM3MTE2MX0.20rdkFP03YFuAURc-5J4QbnrUDNG5H9Xu8Hm_TB4FPw";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return { url, anonKey };
};

export const isSupabaseConfigured = () => {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(
    url &&
      anonKey &&
      !url.includes("your-project") &&
      !anonKey.includes("your-anon-key") &&
      !anonKey.includes("placeholder")
  );
};

export function createClient() {
  const { url, anonKey } = getSupabaseConfig();

  if (!isSupabaseConfigured()) {
    return createBrowserClient<Database>(
      "https://placeholder.supabase.co",
      "placeholder-anon-key"
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, anonKey);
  }

  return browserClient;
}
