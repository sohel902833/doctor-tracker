import type { ApiResponse, FieldErrors, QueryParams } from "./types";

/** A failed API call. `fieldErrors` maps form fields to messages. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const toQueryString = (params?: QueryParams) => {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
};

/** Session is gone (refresh failed too): send the user to the login page. */
const redirectToLogin = () => {
  if (typeof window === "undefined" || window.location.pathname === "/login") {
    return;
  }
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  // Full reload on purpose: drops every cached query of the old session.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/login?next=${next}`);
};

type RequestOptions = { params?: QueryParams; body?: unknown };

const request = async <T>(
  method: string,
  url: string,
  { params, body }: RequestOptions = {},
): Promise<T> => {
  const res = await fetch(`${url}${toQueryString(params)}`, {
    method,
    credentials: "same-origin",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (res.status === 401 && url.startsWith("/api/proxy")) redirectToLogin();
  if (!res.ok || !json?.success) {
    throw new ApiError(
      json?.message ?? "Something went wrong",
      res.status,
      json?.errors ?? {},
    );
  }
  return json.data as T;
};

/** Calls the backend through the Next.js proxy: api.get("/patients", { page: 2 }). */
export const api = {
  get: <T>(path: string, params?: QueryParams) =>
    request<T>("GET", `/api/proxy${path}`, { params }),
  post: <T>(path: string, body?: unknown) =>
    request<T>("POST", `/api/proxy${path}`, { body: body ?? {} }),
  patch: <T>(path: string, body: unknown) =>
    request<T>("PATCH", `/api/proxy${path}`, { body }),
  delete: <T>(path: string) => request<T>("DELETE", `/api/proxy${path}`),
};

/** Calls our own Next.js route handlers (login, logout, session). */
export const appRequest = <T>(method: string, path: string, body?: unknown) =>
  request<T>(method, path, { body });
