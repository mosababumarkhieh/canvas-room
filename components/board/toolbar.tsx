"use client";

import { useCanvasStore } from "@/hooks/use-canvas-store";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { DrawingTool } from "@/types";
import {
  Pen,
  Eraser,
  Square,
  Circle,
  Minus,
  Type,
  MousePointer2,
  Undo2,
  Redo2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
}

const TOOLS: { id: DrawingTool; label: string; icon: React.ReactNode }[] = [
  { id: "select", label: "Select (V)", icon: <MousePointer2 className="h-4 w-4" /> },
  { id: "pen", label: "Pen (P)", icon: <Pen className="h-4 w-4" /> },
  { id: "eraser", label: "Eraser (E)", icon: <Eraser className="h-4 w-4" /> },
  { id: "line", label: "Line (L)", icon: <Minus className="h-4 w-4" /> },
  { id: "rectangle", label: "Rectangle (R)", icon: <Square className="h-4 w-4" /> },
  { id: "circle", label: "Circle (C)", icon: <Circle className="h-4 w-4" /> },
  { id: "text", label: "Text (T)", icon: <Type className="h-4 w-4" /> },
];

const STROKE_COLORS = [
  "#1e1e1e", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
];

const FILL_COLORS = [
  "transparent", "#fef2f2", "#fff7ed", "#fefce8",
  "#f0fdf4", "#eff6ff", "#f5f3ff", "#fdf4ff",
];

const STROKE_WIDTHS = [1, 2, 4, 8];

export function Toolbar({ onUndo, onRedo, onClear }: ToolbarProps) {
  const {
    activeTool, setActiveTool,
    strokeColor, setStrokeColor,
    fillColor, setFillColor,
    strokeWidth, setStrokeWidth,
    opacity, setOpacity,
    fontSize, setFontSize,
  } = useCanvasStore();

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex flex-col gap-1 p-2 bg-white rounded-xl border border-zinc-200 shadow-sm w-12 select-none">
        {/* Tool buttons */}
        {TOOLS.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTool(tool.id)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  activeTool === tool.id
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                )}
                aria-label={tool.label}
              >
                {tool.icon}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{tool.label}</TooltipContent>
          </Tooltip>
        ))}

        <div className="my-1 h-px bg-zinc-100" />

        {/* Undo / Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onUndo}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
              aria-label="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onRedo}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
              aria-label="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Redo (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <div className="my-1 h-px bg-zinc-100" />

        {/* Clear board */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClear}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-red-50 hover:text-red-500 transition-colors"
              aria-label="Clear board"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Clear board</TooltipContent>
        </Tooltip>
      </div>

      {/* Options panel — appears to the right of toolbar */}
      <div className="flex flex-col gap-3 p-3 bg-white rounded-xl border border-zinc-200 shadow-sm w-[168px] select-none">
        {/* Stroke color */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Stroke</p>
          <div className="grid grid-cols-4 gap-1">
            {STROKE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setStrokeColor(c)}
                className={cn(
                  "h-6 w-6 rounded-md ring-offset-1 transition-all",
                  strokeColor === c ? "ring-2 ring-indigo-500" : "hover:scale-110"
                )}
                style={{ backgroundColor: c }}
                aria-label={`Stroke color ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Fill color */}
        {(activeTool === "rectangle" || activeTool === "circle") && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Fill</p>
            <div className="grid grid-cols-4 gap-1">
              {FILL_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setFillColor(c)}
                  className={cn(
                    "h-6 w-6 rounded-md border border-zinc-200 ring-offset-1 transition-all",
                    fillColor === c ? "ring-2 ring-indigo-500" : "hover:scale-110"
                  )}
                  style={{ backgroundColor: c === "transparent" ? "white" : c }}
                  aria-label={`Fill color ${c}`}
                >
                  {c === "transparent" && (
                    <span className="text-[8px] text-zinc-400 font-mono">∅</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stroke width */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Width</p>
          <div className="flex gap-1.5 items-center">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  strokeWidth === w ? "bg-indigo-100 text-indigo-700" : "hover:bg-zinc-100"
                )}
                aria-label={`Stroke width ${w}`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: Math.min(w * 2.5 + 2, 14), height: Math.min(w * 2.5 + 2, 14) }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
            Opacity — {Math.round(opacity * 100)}%
          </p>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-full accent-indigo-600"
          />
        </div>

        {/* Font size for text tool */}
        {activeTool === "text" && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
              Font size — {fontSize}px
            </p>
            <input
              type="range"
              min={10}
              max={72}
              step={2}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
