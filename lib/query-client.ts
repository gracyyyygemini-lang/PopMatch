import { Platform } from "react-native";
import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Local Express port in development. The server reads PORT from .env, but only
 * EXPO_PUBLIC_* variables reach the app bundle, so a non-default server port
 * has to be repeated as EXPO_PUBLIC_API_PORT.
 */
const DEV_API_PORT = Number(process.env.EXPO_PUBLIC_API_PORT) || 5000;

/**
 * Base URL for the Express API, resolved in order of specificity:
 *
 *   1. EXPO_PUBLIC_API_URL  — explicit, use when the API lives on its own host
 *   2. EXPO_PUBLIC_DOMAIN   — the host serving both app and API
 *   3. localhost (dev)      — Expo serves web on :8081 and native bundles from
 *                             there too; the API is a separate process
 *   4. same origin (web)    — production: the server serves dist/ and /api together
 */
export function getApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) {
    return new URL(withProtocol(explicit)).href;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return new URL(withProtocol(domain)).href;
  }

  // Never same-origin in dev: the Expo dev server answers every unknown path,
  // /api/* included, with 200 and the app's HTML, so a misrouted call
  // "succeeds" with a body that isn't JSON.
  if (!__DEV__ && Platform.OS === "web" && typeof window !== "undefined") {
    return new URL(window.location.origin).href;
  }

  return new URL(`http://localhost:${DEV_API_PORT}`).href;
}

function withProtocol(host: string): string {
  const trimmed = host.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Bare localhost (or 127.0.0.1) has no certificate — don't force https.
  const isLocal = /^(localhost|127\.0\.0\.1)(:|$)/i.test(trimmed);
  return `${isLocal ? "http" : "https"}://${trimmed}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  // Every /api route responds with JSON. Anything else means the request
  // reached something other than the Express API — usually the Expo dev
  // server's HTML fallback — and must not count as success.
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw new Error(
      `Expected JSON from ${res.url || "the API"} but got "${type || "no content type"}". ` +
        `Is the API running, and is getApiUrl() (${getApiUrl()}) pointing at it?`
    );
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
