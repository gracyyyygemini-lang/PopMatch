import type { ChatMessage, Conversation } from "@/context/AppContext";
import { apiJson } from "./client";

type ApiConvo = Record<string, unknown>;
type ApiMsg = Record<string, unknown>;

export async function fetchConversations(): Promise<Conversation[]> {
  const rows = await apiJson<ApiConvo[]>("/api/conversations");
  return rows.map((r) => ({
    id: r.id as string,
    participant1Id: r.participant1Id as string,
    participant2Id: r.participant2Id as string,
    listingId: r.listingId as string,
    listingBuilding: r.listingBuilding as string,
    listingPrice: r.listingPrice as number,
    listingUnitType: r.listingUnitType as string | undefined,
    lastMessage: r.lastMessage as string | undefined,
    lastMessageAt: r.lastMessageAt as number | undefined,
    otherUserName: r.otherUserName as string | undefined,
    otherUserAvatar: r.otherUserAvatar as string | undefined,
    otherUserEmail: r.otherUserEmail as string | undefined,
    otherUserProfileImage: r.otherUserProfileImage as string | undefined,
    source: r.source as Conversation["source"],
  }));
}

export async function createConversation(body: {
  participant2Id: string;
  listingId?: string;
  listingBuilding?: string;
  listingPrice?: number;
  listingUnitType?: string;
  source?: string;
}): Promise<Conversation> {
  const r = await apiJson<ApiConvo>("/api/conversations", {
    method: "POST",
    body: JSON.stringify({
      participant2Id: body.participant2Id,
      listingId: body.listingId ?? "",
      listingBuilding: body.listingBuilding ?? "",
      listingPrice: body.listingPrice ?? 0,
      listingUnitType: body.listingUnitType,
      source: body.source,
    }),
  });
  return {
    id: r.id as string,
    participant1Id: r.participant1Id as string,
    participant2Id: r.participant2Id as string,
    listingId: r.listingId as string,
    listingBuilding: r.listingBuilding as string,
    listingPrice: r.listingPrice as number,
    listingUnitType: r.listingUnitType as string | undefined,
    source: r.source as Conversation["source"],
  };
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const rows = await apiJson<ApiMsg[]>(`/api/messages/${conversationId}`);
  return rows.map((m) => ({
    id: m.id as string,
    conversationId: m.conversationId as string,
    senderId: m.senderId as string,
    content: m.content as string,
    createdAt: m.createdAt as number,
  }));
}

export async function sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
  const m = await apiJson<ApiMsg>("/api/messages", {
    method: "POST",
    body: JSON.stringify({ conversationId, content }),
  });
  return {
    id: m.id as string,
    conversationId: m.conversationId as string,
    senderId: m.senderId as string,
    content: m.content as string,
    createdAt: m.createdAt as number,
  };
}
