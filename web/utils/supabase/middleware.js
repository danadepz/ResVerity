import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Refreshes the Supabase auth session on each request and syncs the
// refreshed cookies onto the outgoing response. Invoked from the root
// `proxy.js` (Next.js 16 renamed `middleware` to `proxy`).
export async function updateSession(request) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                );
                supabaseResponse = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                );
            },
        },
    });

    // IMPORTANT: Do not run code between createServerClient and getUser().
    // getUser() revalidates the token and, if needed, writes refreshed
    // session cookies via setAll above.
    await supabase.auth.getUser();

    return supabaseResponse;
}
