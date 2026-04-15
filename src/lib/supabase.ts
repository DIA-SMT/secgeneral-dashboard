import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Se usa sin generic de Database hasta que se generen los tipos automáticos.
// El tipado se aplica a nivel de query result con `as` en cada función.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
