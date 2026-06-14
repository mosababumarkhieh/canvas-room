"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Cloud, CloudOff, Loader2, Copy, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { useAutosave } from "@/hooks/use-autosave";
import { useCanvasStore } from "@/hooks/use-canvas-store";
import { Canvas } from "@/components/board/canvas";
import { Toolbar } from "@/components/board/toolbar";
import { PresenceBar } from "@/components/board/presence-bar";
import { Button } from "@/components/ui/button";
import type { Room, WhiteboardObject } from "@/types";

export default function BoardPage({ params }: { params: { roomId: string } }) {
  const { roomId } = params;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // useState initializers run on the server where window is undefined — always null.
  // useEffect runs only on the client after hydration, so window.location is safe.
  const [shareToken, setShareToken] = useState<string | null>(null);
  useEffect(() => {
    setShareToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  const { setObjects, undo, redo, clearBoard, presenceUsers } = useCanvasStore();

  const { saveStatus } = useAutosave(roomId);

  // Load room + board state — waits until both user and shareToken are resolved.
  useEffect(() => {
    // shareToken starts null and is set asynchronously by the effect above.
    // We delay the load until the token effect has had a chance to run by
    // checking whether the URL actually contains a token param.
    const urlHasToken = typeof window !== "undefined"
      && new URLSearchParams(window.location.search).has("token");

    // If the URL has a token but shareToken hasn't been set yet, wait.
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

  // Socket setup (only after user and room are confirmed)
  const socket = useSocket(
    user && !loadingRoom && !error
      ? { roomId, user }
      : { roomId: "", user: { id: "", email: "", name: "", color: "" } }
  );

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const objects = undo();
        if (objects) socket.emitClear();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, socket]);

  const handleUndo = () => {
    const objects = undo();
    if (objects !== null) {
      // Broadcast clear + redraw for simplicity on undo/redo
      socket.emitClear();
    }
  };

  const handleRedo = () => {
    redo();
  };

  const handleClear = () => {
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

  // Auth redirect
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
          {user && <PresenceBar users={presenceUsers} currentUserId={user.id} />}
        </div>
      </header>

      {/* Canvas area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — tools */}
        <div className="flex-none flex flex-col gap-2 p-2 overflow-y-auto">
          <Toolbar onUndo={handleUndo} onRedo={handleRedo} onClear={handleClear} />
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <Canvas
            onObjectCommit={handleObjectCommit}
            onObjectDelete={handleObjectDelete}
          />
        </div>
      </div>
    </div>
  );
}
