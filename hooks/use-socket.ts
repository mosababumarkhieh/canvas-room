"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useCanvasStore } from "@/hooks/use-canvas-store";
import type {
  AuthUser,
  WhiteboardObject,
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketOptions {
  roomId: string;
  user: AuthUser;
  ownerId: string;
}

export function useSocket({ roomId, user, ownerId }: UseSocketOptions) {
  const socketRef = useRef<AppSocket | null>(null);

  useEffect(() => {
    if (!roomId || !user.id) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";
    const socket: AppSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("room:join", { roomId, user, ownerId });
    });

    socket.on("room:users", (users) => {
      useCanvasStore.getState().setPresenceUsers(users);
    });

    socket.on("object:draw", (object) => {
      useCanvasStore.getState().addRemoteObject(object);
    });

    socket.on("object:update", (object) => {
      useCanvasStore.getState().updateRemoteObject(object.id, object);
    });

    socket.on("object:delete", (objectId) => {
      useCanvasStore.getState().deleteRemoteObject(objectId);
    });

    socket.on("board:clear", () => {
      useCanvasStore.getState().clearRemoteBoard();
    });

    // Full board state sync from a remote undo/redo
    socket.on("board:sync", (objects) => {
      console.log("[socket] received board:sync", objects.length, "objects");
      useCanvasStore.getState().syncRemoteBoard(objects);
    });

    socket.on("cursor:update", (cursor) => {
      useCanvasStore.getState().updateCursor(cursor);
    });

    socket.on("cursor:remove", (userId) => {
      useCanvasStore.getState().removeCursor(userId);
    });

    socket.on("room:permission-update", ({ userId, permission }) => {
      console.log("[socket] received room:permission-update", { userId, permission });
      useCanvasStore.getState().setUserPermission(userId, permission);
    });

    socket.on("room:permissions-init", (permissions) => {
      useCanvasStore.getState().initPermissions(permissions);
    });

    return () => {
      socket.emit("room:leave", roomId);
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user.id]);

  const emitDraw = useCallback((object: WhiteboardObject) => {
    socketRef.current?.emit("object:draw", { roomId, object });
  }, [roomId]);

  const emitUpdate = useCallback((object: WhiteboardObject) => {
    socketRef.current?.emit("object:update", { roomId, object });
  }, [roomId]);

  const emitDelete = useCallback((objectId: string) => {
    socketRef.current?.emit("object:delete", { roomId, objectId });
  }, [roomId]);

  const emitClear = useCallback(() => {
    socketRef.current?.emit("board:clear", roomId);
  }, [roomId]);

  const emitBoardSync = useCallback((objects: WhiteboardObject[]) => {
    console.log("[socket] emitBoardSync", { roomId, objectCount: objects.length, connected: !!socketRef.current?.connected });
    socketRef.current?.emit("board:sync", { roomId, objects });
  }, [roomId]);

  const emitCursor = useCallback((x: number, y: number) => {
    socketRef.current?.emit("cursor:move", { roomId, x, y });
  }, [roomId]);

  const emitSetPermission = useCallback((targetUserId: string, permission: "edit" | "view") => {
    console.log("[socket] emitSetPermission", { roomId, targetUserId, permission, connected: !!socketRef.current?.connected });
    socketRef.current?.emit("room:set-permission", { roomId, targetUserId, permission });
  }, [roomId]);

  return { emitDraw, emitUpdate, emitDelete, emitClear, emitBoardSync, emitCursor, emitSetPermission };
}
