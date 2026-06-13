"use client";

import { useState, FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateRoomDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, isPublic: boolean) => Promise<void>;
}

export function CreateRoomDialog({ open, onClose, onCreate }: CreateRoomDialogProps) {
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setLoading(true);
    try {
      await onCreate(name.trim(), isPublic);
      setName("");
      setIsPublic(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new room</DialogTitle>
          <DialogDescription>
            Give your whiteboard room a name. You can change this later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="room-name">Room name</Label>
            <Input
              id="room-name"
              placeholder="e.g. Sprint Planning, Design Review"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="room-public"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            <Label htmlFor="room-public" className="cursor-pointer">
              Make public (anyone with the link can view)
            </Label>
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
              {loading ? "Creating…" : "Create room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
