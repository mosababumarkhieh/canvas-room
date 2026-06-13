"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { PresenceUser } from "@/types";

interface PresenceBarProps {
  users: PresenceUser[];
  currentUserId: string;
}

export function PresenceBar({ users, currentUserId }: PresenceBarProps) {
  if (users.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1">
        {users.map((u) => (
          <Tooltip key={u.socketId}>
            <TooltipTrigger asChild>
              <div className="relative">
                <Avatar className="h-7 w-7 ring-2 ring-white">
                  <AvatarFallback
                    style={{ backgroundColor: u.color }}
                    className="text-[11px] font-semibold text-white"
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {u.userId === currentUserId && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 ring-1 ring-white" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {u.name} {u.userId === currentUserId ? "(you)" : ""}
            </TooltipContent>
          </Tooltip>
        ))}
        <span className="ml-1 text-xs text-zinc-400">
          {users.length} online
        </span>
      </div>
    </TooltipProvider>
  );
}
