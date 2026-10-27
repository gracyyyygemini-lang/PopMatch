import type { ChatMessage, Conversation } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";

/**
 * Conversations and messages live in Postgres, reached through the Express API
 * like profiles and likes are (see lib/users.ts). The API returns camelCase
 * shapes; it maps the snake_case columns itself. Participant and sender ids
 * are users.id values — use the id the server returned for a profile.
 */

/**
 * apiRequest errors read `404: {"error":"…"}`. The server's sentence is the
 * part worth showing a person; anything else is passed through as-is.
 */
export function apiErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  const match = /^\d{3}: ([\s\S]*)$/.exec(text);
  if (match) {
    try {
      const body = JSON.parse(match[1]);
      if (typeof body?.error === "string") return body.error;
    } catch {}
  }
  return text;
}

export interface NewConversation {
  participant1Id: string;
  participant2Id: string;
  listingId: string;
  listingBuilding: string;
  listingPrice: number;
}

/** Returns the existing conversation if either side already opened one for this listing. */
export async function openConversation(input: NewConversation): Promise<Conversation> {
  const res = await apiRequest("POST", "/api/conversations", input);
  return (await res.json()) as Conversation;
}

/** Everything `userId` is in, most recently active first. */
export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const res = await apiRequest("GET", `/api/conversations/${encodeURIComponent(userId)}`);
  return (await res.json()) as Conversation[];
}

/** Oldest first. */
export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const res = await apiRequest("GET", `/api/messages/${encodeURIComponent(conversationId)}`);
  return (await res.json()) as ChatMessage[];
}

/** Idempotent per `id`: resending after a lost response won't duplicate the message. */
export async function postMessage(
  message: Pick<ChatMessage, "id" | "conversationId" | "senderId" | "content">,
): Promise<ChatMessage> {
  const res = await apiRequest("POST", "/api/messages", message);
  return (await res.json()) as ChatMessage;
}
