import { updateSession } from '@/utils/supabase/middleware';

// Next.js 16 renamed the `middleware` file convention to `proxy`.
// This runs before rendering to keep the Supabase auth session fresh.
export async function proxy(request) {
    return updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api (Route Handlers manage their own Supabase access)
         * - _next/static, _next/image (build/static assets)
         * - favicon.ico and common image files
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};
