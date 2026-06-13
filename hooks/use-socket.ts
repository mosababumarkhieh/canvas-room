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
}

export function useSocket({ roomId, user }: UseSocketOptions) {
  const socketRef = useRef<AppSocket | null>(null);

  // Pull store actions once via getState() inside the effect so the effect
  // dependency array stays stable — these Zustand actions never change identity.
  useEffect(() => {
    if (!roomId || !user.id) return;

    // NEXT_PUBLIC_SOCKET_URL should be set when the socket server runs on a
    // separate host (e.g. Railway). Leave it empty for local dev or when the
    // full app runs on a single server (Railway full-deploy).
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";
    const socket: AppSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("room:join", { roomId, user });
    });

    socket.on("room:users", (users) => {
      useCanvasStore.getState().setPresenceUsers(users);
    });

    // Remote mutations: do NOT set isDirty or push history.
    // The sender's client is responsible for its own autosave.
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

    socket.on("cursor:update", (cursor) => {
      useCanvasStore.getState().updateCursor(cursor);
    });

    socket.on("cursor:remove", (userId) => {
      useCanvasStore.getState().removeCursor(userId);
    });

    return () => {
      socket.emit("room:leave", roomId);
      socket.disconnect();
      socketRef.current = null;
    };
  // Only reconnect when the actual room or user identity changes.
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

  const emitCursor = useCallback((x: number, y: number) => {
    socketRef.current?.emit("cursor:move", { roomId, x, y });
  }, [roomId]);

  return { emitDraw, emitUpdate, emitDelete, emitClear, emitCursor };
}
