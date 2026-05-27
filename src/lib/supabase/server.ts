import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para Server Components y Server Actions.
 * Lee la sesión del usuario desde cookies; las queries respetan RLS automáticamente.
 *
 * Uso:
 *   const supabase = await getSupabaseServer();
 *   const { data } = await supabase.from("proyecto").select("*");
 */
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options as CookieOptions);
            }
          } catch {
            // Server Components no pueden setear cookies — el middleware lo hace
          }
        },
      },
    }
  );
}
