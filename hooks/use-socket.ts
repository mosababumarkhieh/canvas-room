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
  const { addObject, updateObject, deleteObject, clearBoard, updateCursor, removeCursor, setPresenceUsers } =
    useCanvasStore();

  useEffect(() => {
    const socket: AppSocket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("room:join", { roomId, user });
    });

    socket.on("room:users", (users) => {
      setPresenceUsers(users);
    });

    socket.on("object:draw", (object) => {
      addObject(object);
    });

    socket.on("object:update", (object) => {
      updateObject(object.id, object);
    });

    socket.on("object:delete", (objectId) => {
      deleteObject(objectId);
    });

    socket.on("board:clear", () => {
      clearBoard();
    });

    socket.on("cursor:update", (cursor) => {
      updateCursor(cursor);
    });

    socket.on("cursor:remove", (userId) => {
      removeCursor(userId);
    });

    return () => {
      socket.emit("room:leave", roomId);
      socket.disconnect();
    };
  }, [roomId, user, addObject, updateObject, deleteObject, clearBoard, updateCursor, removeCursor, setPresenceUsers]);

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
