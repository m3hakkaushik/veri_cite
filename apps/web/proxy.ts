import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(
  async (auth, request) => {
    const path = request.nextUrl.pathname;
    // Early redirect only; protected pages also authenticate at the resource.
    if (path === "/app" || path.startsWith("/app/")) await auth.protect();
    const isApi = path === "/api/v1" || path.startsWith("/api/v1/");
    const isPublic =
      path === "/api/v1/health" || path.startsWith("/api/v1/share/");
    // Each future handler must independently authorize its resource before DB access.
    if (isApi && !isPublic) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          { error: { code: "unauthorized", message: "Sign in to continue." } },
          { status: 401 },
        );
      }
    }
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
