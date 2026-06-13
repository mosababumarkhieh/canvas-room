"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical, Pencil, Trash2, Globe, Lock, Copy, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Room } from "@/types";
import { formatDate } from "@/lib/utils";

interface RoomCardProps {
  room: Room;
  userId: string;
  onRename: (room: Room) => void;
  onDelete: (room: Room) => void;
}

export function RoomCard({ room, userId, onRename, onDelete }: RoomCardProps) {
  const [copied, setCopied] = useState(false);
  const isOwner = room.ownerId === userId;
  const shareUrl = `${window.location.origin}/board/${room.id}?token=${room.shareToken}`;

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allUsers = [
    room.owner,
    ...room.members.map((m) => m.user).filter((u) => u.id !== room.owner.id),
  ].slice(0, 5);

  return (
    <div className="group relative bg-white rounded-xl border border-zinc-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Canvas preview area */}
      <Link href={`/board/${room.id}`}>
        <div className="h-32 bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center">
          <div className="text-zinc-300">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M8 12l3 3 5-5" />
            </svg>
          </div>
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/board/${room.id}`}>
              <h3 className="font-semibold text-zinc-900 truncate hover:text-indigo-600 transition-colors">
                {room.name}
              </h3>
            </Link>
            <p className="text-xs text-zinc-400 mt-0.5">{formatDate(room.updatedAt)}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 shrink-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Room options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyShareLink}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy share link"}
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuItem onClick={() => onRename(room)}>
                    <Pencil className="h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(room)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between mt-3">
          {/* Collaborator avatars */}
          <div className="flex -space-x-1.5">
            {allUsers.map((u) => (
              <Avatar key={u.id} className="h-6 w-6 ring-2 ring-white">
                <AvatarFallback style={{ backgroundColor: u.color }} className="text-[10px]">
                  {u.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-zinc-400">
            {room.isPublic ? (
              <Globe className="h-3 w-3" />
            ) : (
              <Lock className="h-3 w-3" />
            )}
            <span>{room.isPublic ? "Public" : "Private"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
