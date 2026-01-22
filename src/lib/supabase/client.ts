import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';

/**
 * Supabase 클라이언트 (브라우저용)
 * Client Component에서 사용
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
