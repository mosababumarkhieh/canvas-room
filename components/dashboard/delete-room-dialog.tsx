"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Room } from "@/types";

interface DeleteRoomDialogProps {
  room: Room | null;
  onClose: () => void;
  onDelete: (roomId: string) => Promise<void>;
}

export function DeleteRoomDialog({ room, onClose, onDelete }: DeleteRoomDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!room) return;
    setLoading(true);
    try {
      await onDelete(room.id);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!room} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete room</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium text-zinc-900">{room?.name}</span>? This will permanently
            remove all whiteboard content and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting…" : "Delete room"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
