import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check for the token in cookies
    const token = request.cookies.get('token')?.value;

    const { pathname } = request.nextUrl;

    // Protected routes
    const protectedRoutes = ['/lobby', '/game', '/profile'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    if (isProtectedRoute && !token) {
        // Redirect to home if accessing a protected route without a token
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    // Handle case where user is logged in but tries to access login/signup
    const authRoutes = ['/']; // Or wherever login/signup is located
    if (pathname === '/' && token) {
        const url = request.nextUrl.clone();
        url.pathname = '/lobby';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
