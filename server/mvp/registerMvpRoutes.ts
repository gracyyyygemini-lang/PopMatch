import type { Express } from "express";
import { registerMeRoutes } from "./routes/me";
import { registerListingRoutes } from "./routes/listings";
import { registerChatRoutes } from "./routes/chat";

export function registerMvpRoutes(app: Express) {
  registerMeRoutes(app);
  registerListingRoutes(app);
  registerChatRoutes(app);
}
