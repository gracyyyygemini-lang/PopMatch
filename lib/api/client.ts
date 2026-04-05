import { getApiUrl } from "@/lib/query-client";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

export async function getFirebaseIdToken(): Promise<string | null> {
  const u = auth.currentUser;
  if (!u) return null;
  return getIdToken(u);
}

export async function apiFetch(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<Response> {
  const { auth: useAuth = true, headers: hdrs, body, ...rest } = init;
  const headers = new Headers(hdrs);
  if (useAuth) {
    const token = await getFirebaseIdToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  if (body != null && typeof body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = new URL(path.replace(/^\//, ""), getApiUrl());
  const req: RequestInit = {
    ...rest,
    headers,
    credentials: "include",
  };
  if (body !== undefined && body !== null) {
    req.body = body;
  }
  const res = await fetch(url.toString(), req);
  return res;
}

export async function apiJson<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const res = await apiFetch(path, init);
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(res.status, text || res.statusText);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
