"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Lock, Unlock } from "lucide-react";
import type { PresenceUser } from "@/types";

interface PresenceBarProps {
  users: PresenceUser[];
  currentUserId: string;
  isOwner?: boolean;
  permissions?: Record<string, "edit" | "view">;
  onSetPermission?: (targetUserId: string, permission: "edit" | "view") => void;
}

export function PresenceBar({
  users,
  currentUserId,
  isOwner = false,
  permissions = {},
  onSetPermission,
}: PresenceBarProps) {
  if (users.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1">
        {users.map((u) => {
          const isSelf = u.userId === currentUserId;
          const isViewOnly = permissions[u.userId] === "view";
          const canManage = isOwner && !isSelf;

          const avatar = (
            <div className="relative">
              <Avatar className="h-7 w-7 ring-2 ring-white">
                <AvatarFallback
                  style={{ backgroundColor: u.color }}
                  className="text-[11px] font-semibold text-white"
                >
                  {u.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isSelf && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 ring-1 ring-white" />
              )}
              {!isSelf && isViewOnly && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-white flex items-center justify-center ring-1 ring-white">
                  <Lock className="h-2 w-2 text-zinc-500" />
                </span>
              )}
            </div>
          );

          if (canManage) {
            return (
              <DropdownMenu key={u.socketId}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button className="focus:outline-none rounded-full">
                        {avatar}
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    {u.name} {isViewOnly ? "(view only)" : "(can edit)"}
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent side="bottom" align="end" className="w-44">
                  <DropdownMenuLabel className="text-xs">{u.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isViewOnly ? (
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer"
                      onClick={() => onSetPermission?.(u.userId, "edit")}
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      Allow editing
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                      onClick={() => onSetPermission?.(u.userId, "view")}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      View only
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          return (
            <Tooltip key={u.socketId}>
              <TooltipTrigger asChild>
                <div>{avatar}</div>
              </TooltipTrigger>
              <TooltipContent>
                {u.name}{isSelf ? " (you)" : ""}{isViewOnly ? " — view only" : ""}
              </TooltipContent>
            </Tooltip>
          );
        })}
        <span className="ml-1 text-xs text-zinc-400">
          {users.length} online
        </span>
      </div>
    </TooltipProvider>
  );
}
