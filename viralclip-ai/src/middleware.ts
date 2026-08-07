/**
 * Clerk middleware — required for `auth()` to work in server components and
 * route handlers. The build spec omitted this; without it every `auth()` call
 * throws. Public routes (landing, auth pages, and the inbound webhooks/
 * uploadthing endpoints, which verify their own signatures) are allow-listed.
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/uploadthing(.*)",
  "/api/inngest(.*)",
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth().protect();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
