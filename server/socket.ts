import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PresenceUser,
  WhiteboardObject,
} from "@/types";

// In-memory room state
const roomPresence = new Map<string, Map<string, PresenceUser>>();

export function initSocketServer(httpServer: HTTPServer) {
  // Accept the configured app URL, or any origin in development.
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? [process.env.NEXT_PUBLIC_APP_URL]
    : true; // true = accept all origins (safe for local dev)

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: allowedOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    let currentRoomId: string | null = null;
    let currentUser: PresenceUser | null = null;

    socket.on("room:join", ({ roomId, user }) => {
      currentRoomId = roomId;
      currentUser = {
        userId: user.id,
        name: user.name,
        color: user.color,
        socketId: socket.id,
      };

      socket.join(roomId);

      if (!roomPresence.has(roomId)) {
        roomPresence.set(roomId, new Map());
      }
      roomPresence.get(roomId)!.set(socket.id, currentUser);

      // Broadcast updated presence list
      const users = Array.from(roomPresence.get(roomId)!.values());
      io.to(roomId).emit("room:users", users);
    });

    socket.on("room:leave", (roomId) => {
      socket.leave(roomId);
      roomPresence.get(roomId)?.delete(socket.id);
      const users = Array.from(roomPresence.get(roomId)?.values() ?? []);
      io.to(roomId).emit("room:users", users);
    });

    socket.on("cursor:move", ({ roomId, x, y }) => {
      if (!currentUser) return;
      socket.to(roomId).emit("cursor:update", {
        userId: currentUser.userId,
        name: currentUser.name,
        color: currentUser.color,
        x,
        y,
      });
    });

    socket.on("object:draw", ({ roomId, object }) => {
      socket.to(roomId).emit("object:draw", object);
    });

    socket.on("object:update", ({ roomId, object }) => {
      socket.to(roomId).emit("object:update", object);
    });

    socket.on("object:delete", ({ roomId, objectId }) => {
      socket.to(roomId).emit("object:delete", objectId);
    });

    socket.on("board:clear", (roomId) => {
      socket.to(roomId).emit("board:clear");
    });

    socket.on("disconnect", () => {
      if (currentRoomId) {
        roomPresence.get(currentRoomId)?.delete(socket.id);
        const users = Array.from(roomPresence.get(currentRoomId)?.values() ?? []);
        io.to(currentRoomId).emit("room:users", users);

        if (currentUser) {
          socket.to(currentRoomId).emit("cursor:remove", currentUser.userId);
        }

        // Clean up empty rooms
        if (roomPresence.get(currentRoomId)?.size === 0) {
          roomPresence.delete(currentRoomId);
        }
      }
    });
  });

  return io;
}
