"use client";

import { useState, FormEvent, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Room } from "@/types";

interface RenameRoomDialogProps {
  room: Room | null;
  onClose: () => void;
  onRename: (roomId: string, name: string) => Promise<void>;
}

export function RenameRoomDialog({ room, onClose, onRename }: RenameRoomDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (room) setName(room.name);
  }, [room]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!room || !name.trim()) return;
    setError("");
    setLoading(true);
    try {
      await onRename(room.id, name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!room} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename room</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-name">New name</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
