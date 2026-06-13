"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "@/hooks/use-canvas-store";

const AUTOSAVE_DELAY = 2000;

export function useAutosave(roomId: string) {
  const { objects, isDirty, setDirty } = useCanvasStore();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!isDirty) return;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/rooms/${roomId}/objects`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objects }),
        });

        if (res.ok) {
          setSaveStatus("saved");
          setDirty(false);
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timerRef.current);
  }, [objects, isDirty, roomId, setDirty]);

  return { saveStatus };
}
