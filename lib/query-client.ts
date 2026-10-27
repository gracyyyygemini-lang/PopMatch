import { Platform } from "react-native";
import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/** Local Express port when nothing else is configured (see server/index.ts). */
const DEV_API_PORT = 5000;

/**
 * Base URL for the Express API, resolved in order of specificity:
 *
 *   1. EXPO_PUBLIC_API_URL  — explicit, use when the API lives on its own host
 *   2. EXPO_PUBLIC_DOMAIN   — the host serving both app and API
 *   3. same origin (web)    — the server serves dist/ and /api together
 *   4. localhost (native)   — development default
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

  if (Platform.OS === "web" && typeof window !== "undefined") {
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
