import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PAGE_PERMISSIONS } from '@/lib/permissions';

// Prefixes that bypass auth entirely (NOTE: do not put '/' here — it is a
// prefix of every path. The landing page '/' is matched exactly below.)
const excludedPrefixes = [
  '/api/auth',
  '/_next',
  '/images',
  '/favicon.ico',
  '/login',
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path === '/' || excludedPrefixes.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not signed in: API callers get JSON 401, pages get redirected to login.
  if (!token) {
    if (path.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', path + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Page-level permission gating. API routes enforce their own (method-aware)
  // authorization inside each handler.
  const permissions = (token.permissions as string[]) ?? [];
  const rule = PAGE_PERMISSIONS.find((r) => path.startsWith(r.prefix));
  if (rule && !permissions.includes(rule.perm)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|images|public|login).*)',
  ],
};
