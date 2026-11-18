import type { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/auth/forward";

/** The logged-in user's profile (refreshes the session if needed). */
export async function GET(req: NextRequest) {
  return forwardToBackend(req, "/auth/profile");
}
