const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null quando o app roda sem Supabase ("modo local", dados só neste navegador). */
export const supabaseConfig = (): { url: string; key: string } | null => (url && key ? { url, key } : null)
