"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, LogOut, LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoomCard } from "@/components/dashboard/room-card";
import { CreateRoomDialog } from "@/components/dashboard/create-room-dialog";
import { RenameRoomDialog } from "@/components/dashboard/rename-room-dialog";
import { DeleteRoomDialog } from "@/components/dashboard/delete-room-dialog";
import type { Room } from "@/types";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameRoom, setRenameRoom] = useState<Room | null>(null);
  const [deleteRoom, setDeleteRoom] = useState<Room | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms);
      }
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchRooms();
  }, [user, fetchRooms]);

  const handleCreate = async (name: string, isPublic: boolean) => {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, isPublic }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setRooms((prev) => [data.room, ...prev]);
    router.push(`/board/${data.room.id}`);
  };

  const handleRename = async (roomId: string, name: string) => {
    const res = await fetch(`/api/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setRooms((prev) => prev.map((r) => (r.id === roomId ? data.room : r)));
  };

  const handleDelete = async (roomId: string) => {
    const res = await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-zinc-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Pencil className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-zinc-900">CanvasRoom</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback style={{ backgroundColor: user.color }} className="text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-zinc-700 font-medium">{user.name}</span>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={logout} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Your rooms</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {rooms.length} room{rooms.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New room
          </Button>
        </div>

        {roomsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-zinc-200 h-48 animate-pulse" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <LayoutGrid className="h-8 w-8 text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">No rooms yet</h2>
            <p className="text-sm text-zinc-500 mb-6 max-w-xs">
              Create your first whiteboard room to start collaborating with your team.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create your first room
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                userId={user.id}
                onRename={setRenameRoom}
                onDelete={setDeleteRoom}
              />
            ))}
          </div>
        )}
      </main>

      <CreateRoomDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
      <RenameRoomDialog
        room={renameRoom}
        onClose={() => setRenameRoom(null)}
        onRename={handleRename}
      />
      <DeleteRoomDialog
        room={deleteRoom}
        onClose={() => setDeleteRoom(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}
