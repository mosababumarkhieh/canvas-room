"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Pencil, Cloud, CloudOff, Loader2, Copy, Check, PanelLeft, X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { useAutosave } from "@/hooks/use-autosave";
import { useCanvasStore } from "@/hooks/use-canvas-store";
import { Canvas } from "@/components/board/canvas";
import { Toolbar } from "@/components/board/toolbar";
import { PresenceBar } from "@/components/board/presence-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Room, WhiteboardObject } from "@/types";

export default function BoardPage({ params }: { params: { roomId: string } }) {
  const { roomId } = params;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [shareToken, setShareToken] = useState<string | null>(null);
  useEffect(() => {
    setShareToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  const { setObjects, undo, redo, clearBoard, presenceUsers, permissions } = useCanvasStore();

  // Derive ownership early so useAutosave can gate on it
  const ownerId = room?.ownerId ?? "";
  const isOwner = user?.id === ownerId;

  // Only the room owner autosaves — non-owners' changes reach the owner via socket sync
  const { saveStatus } = useAutosave(roomId, isOwner);

  useEffect(() => {
    const urlHasToken = typeof window !== "undefined"
      && new URLSearchParams(window.location.search).has("token");

    if (!user || (urlHasToken && shareToken === null)) return;

    async function load() {
      try {
        const roomUrl = shareToken
          ? `/api/rooms/${roomId}?token=${encodeURIComponent(shareToken)}`
          : `/api/rooms/${roomId}`;

        const [roomRes, objectsRes] = await Promise.all([
          fetch(roomUrl),
          fetch(`/api/rooms/${roomId}/objects`),
        ]);

        if (!roomRes.ok) {
          setError(roomRes.status === 403 ? "You don't have access to this room." : "Room not found.");
          return;
        }

        const { room } = await roomRes.json();
        setRoom(room);

        if (objectsRes.ok) {
          const { objects } = await objectsRes.json();
          setObjects(objects);
        }
      } catch {
        setError("Failed to load room.");
      } finally {
        setLoadingRoom(false);
      }
    }

    load();
  }, [user, roomId, shareToken, setObjects]);

  // canEdit: owner always can; others depend on their permission (default "edit")
  const canEdit = isOwner || (permissions[user?.id ?? ""] ?? "edit") === "edit";

  const socket = useSocket(
    user && !loadingRoom && !error
      ? { roomId, user, ownerId }
      : { roomId: "", user: { id: "", email: "", name: "", color: "" }, ownerId: "" }
  );

  // Always-current ref to socket — avoids stale closures in event listeners
  // (socket object changes every render; emitBoardSync ref inside it also changes when roomId loads)
  const socketLatest = useRef(socket);
  useEffect(() => { socketLatest.current = socket; });

  // Keyboard shortcuts — use socketLatest.current so the handler always has the real roomId/socket
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!canEdit) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const objects = undo();
        if (objects !== null) {
          socketLatest.current.emitBoardSync(objects);
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        const objects = redo();
        if (objects !== null) {
          socketLatest.current.emitBoardSync(objects);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, canEdit]);

  const handleUndo = () => {
    if (!canEdit) return;
    const objects = undo();
    if (objects !== null) {
      socketLatest.current.emitBoardSync(objects);
    }
  };

  const handleRedo = () => {
    if (!canEdit) return;
    const objects = redo();
    if (objects !== null) {
      socketLatest.current.emitBoardSync(objects);
    }
  };

  const handleClear = () => {
    if (!canEdit) return;
    clearBoard();
    socket.emitClear();
  };

  const handleObjectCommit = (obj: WhiteboardObject) => {
    socket.emitDraw(obj);
  };

  const handleObjectDelete = (id: string) => {
    socket.emitDelete(id);
  };

  const copyShareLink = async () => {
    if (!room) return;
    const url = `${window.location.origin}/board/${roomId}?token=${room.shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  if (authLoading || loadingRoom) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-50 gap-4">
        <p className="text-zinc-600 text-sm">{error}</p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-50">
      {/* Header */}
      <header className="flex-none flex items-center justify-between px-4 h-12 bg-white border-b border-zinc-200 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600">
              <Pencil className="h-3 w-3 text-white" />
            </div>
            <h1 className="font-semibold text-sm text-zinc-900 truncate max-w-[200px]">
              {room?.name ?? "Whiteboard"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Save status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving…
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Cloud className="h-3 w-3 text-green-500" />
                <span className="text-green-600">Saved</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <CloudOff className="h-3 w-3 text-red-500" />
                <span className="text-red-500">Save failed</span>
              </>
            )}
          </div>

          {/* Share link */}
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Share"}
          </Button>

          {/* Presence */}
          {user && (
            <PresenceBar
              users={presenceUsers}
              currentUserId={user.id}
              isOwner={isOwner}
              permissions={permissions}
              onSetPermission={socket.emitSetPermission}
            />
          )}
        </div>
      </header>

      {/* Canvas area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-10 bg-black/20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left sidebar — tools */}
        <div
          className={cn(
            "flex-none flex-col gap-2 p-2 z-20 overflow-y-auto",
            "md:flex", // always visible on md+
            sidebarOpen ? "flex fixed left-0 top-12 bottom-0 bg-zinc-50 border-r border-zinc-200 shadow-lg" : "hidden md:flex"
          )}
        >
          <Toolbar
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
            canEdit={canEdit}
          />
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <Canvas
            onObjectCommit={handleObjectCommit}
            onObjectDelete={handleObjectDelete}
            onCursorMove={socket.emitCursor}
            canEdit={canEdit}
          />
        </div>

        {/* Mobile sidebar toggle button */}
        <button
          className="md:hidden absolute top-2 left-2 z-30 bg-white border border-zinc-200 shadow-sm rounded-lg p-2 text-zinc-600 hover:bg-zinc-50 transition-colors"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle tools"
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
