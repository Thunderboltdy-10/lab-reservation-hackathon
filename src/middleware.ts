import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { db } from './server/db'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from './server/api/root'
import superjson from "superjson";

const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/clerk(.*)',
    '/api/trpc/(.*)',
    '/404(.*)',
])

const adminOnlyRoutes = "/roles"
const teacherOnlyRoutes = "/lab"
const studentOnlyRoutes = "/book"

export default clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
        await auth.protect()

        const trpc = createTRPCProxyClient<AppRouter>({
            links: [
                httpBatchLink({
                    url: `${req.nextUrl.origin}/api/trpc`,
                    fetch: fetch,
                    headers: () => ({cookie: req.headers.get('cookie')  ?? ""}),
                    transformer: superjson,
                }),
            ]
        })

        const account = await trpc.account.getAccount.query()
        if (!account) throw new Error("Account not found")
        
        const role = account.role

        if (role === "STUDENT") {
            if (new RegExp(adminOnlyRoutes).test(req.nextUrl.pathname) || new RegExp(teacherOnlyRoutes).test(req.nextUrl.pathname)) throw new Error("You do not have access to this page")
        } else if (role === "TEACHER") {
            if (new RegExp(adminOnlyRoutes).test(req.nextUrl.pathname) || new RegExp(studentOnlyRoutes).test(req.nextUrl.pathname)) throw new Error("You do not have access to this page")
        }

    }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}