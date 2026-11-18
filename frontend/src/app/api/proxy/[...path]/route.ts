import type { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/auth/forward";

/**
 * Every API call from the browser goes through here:
 *   /api/proxy/patients?page=2  ->  BACKEND_URL/patients?page=2
 * The auth token is added from the httpOnly cookie.
 */
const handle = async (
  req: NextRequest,
  ctx: RouteContext<"/api/proxy/[...path]">,
) => {
  const { path } = await ctx.params;
  const target = `/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  return forwardToBackend(req, target);
};

export {
  handle as DELETE,
  handle as GET,
  handle as PATCH,
  handle as POST,
  handle as PUT,
};
