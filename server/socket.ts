import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PresenceUser,
  PermissionUpdate,
} from "@/types";

const roomPresence = new Map<string, Map<string, PresenceUser>>();
const roomOwners = new Map<string, string>(); // roomId → ownerId (userId)
const roomPermissions = new Map<string, Map<string, "edit" | "view">>(); // roomId → userId → permission

export function initSocketServer(httpServer: HTTPServer) {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? [process.env.NEXT_PUBLIC_APP_URL]
    : true;

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

    socket.on("room:join", ({ roomId, user, ownerId }) => {
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

      // Record the room owner (first joiner sets it from the authoritative ownerId)
      if (!roomOwners.has(roomId)) {
        roomOwners.set(roomId, ownerId);
      }

      // Initialize permission store for this room
      if (!roomPermissions.has(roomId)) {
        roomPermissions.set(roomId, new Map());
      }
      const perms = roomPermissions.get(roomId)!;

      // New users default to "edit"; owner always remains "edit"
      if (!perms.has(user.id)) {
        perms.set(user.id, "edit");
      }

      // Send the current permission state to this socket so it knows its own permission
      const permsArray: PermissionUpdate[] = Array.from(perms.entries()).map(
        ([uid, permission]) => ({ userId: uid, permission })
      );
      socket.emit("room:permissions-init", permsArray);

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

    // Broadcast a full board state snapshot (used after undo/redo)
    socket.on("board:sync", ({ roomId, objects }) => {
      console.log(`[server] board:sync from ${socket.id} → room ${roomId}, ${objects.length} objects`);
      socket.to(roomId).emit("board:sync", objects);
    });

    // Change a user's permission (UI only shows this control to the room owner)
    socket.on("room:set-permission", ({ roomId, targetUserId, permission }) => {
      console.log(`[server] room:set-permission: target=${targetUserId} perm=${permission} currentUser=${currentUser?.userId ?? "NULL"}`);
      if (!currentUser) return;

      roomPermissions.get(roomId)?.set(targetUserId, permission);
      console.log(`[server] emitting room:permission-update to room ${roomId}`);
      io.to(roomId).emit("room:permission-update", { userId: targetUserId, permission });
    });

    socket.on("disconnect", () => {
      if (currentRoomId) {
        roomPresence.get(currentRoomId)?.delete(socket.id);
        const users = Array.from(roomPresence.get(currentRoomId)?.values() ?? []);
        io.to(currentRoomId).emit("room:users", users);

        if (currentUser) {
          socket.to(currentRoomId).emit("cursor:remove", currentUser.userId);
        }

        if (roomPresence.get(currentRoomId)?.size === 0) {
          roomPresence.delete(currentRoomId);
          roomOwners.delete(currentRoomId);
          roomPermissions.delete(currentRoomId);
        }
      }
    });
  });

  return io;
}
