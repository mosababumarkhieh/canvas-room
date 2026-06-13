"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useCanvasStore } from "@/hooks/use-canvas-store";
import type {
  WhiteboardObject,
  PenObject,
  RectangleObject,
  CircleObject,
  LineObject,
  TextObject,
  Point,
} from "@/types";

interface CanvasProps {
  onObjectCommit?: (object: WhiteboardObject) => void;
  onObjectDelete?: (id: string) => void;
}

function drawObject(ctx: CanvasRenderingContext2D, obj: WhiteboardObject) {
  ctx.save();
  ctx.globalAlpha = obj.opacity;
  ctx.strokeStyle = obj.strokeColor;
  ctx.lineWidth = obj.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = obj.fillColor === "transparent" ? "rgba(0,0,0,0)" : obj.fillColor;

  switch (obj.type) {
    case "pen": {
      const pen = obj as PenObject;
      if (pen.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(pen.points[0].x, pen.points[0].y);
      for (let i = 1; i < pen.points.length; i++) {
        const prev = pen.points[i - 1];
        const curr = pen.points[i];
        ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
      }
      ctx.stroke();
      break;
    }
    case "rectangle": {
      const rect = obj as RectangleObject;
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      if (obj.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }
    case "circle": {
      const circle = obj as CircleObject;
      ctx.beginPath();
      ctx.ellipse(circle.x, circle.y, Math.abs(circle.radiusX), Math.abs(circle.radiusY), 0, 0, Math.PI * 2);
      if (obj.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }
    case "line": {
      const line = obj as LineObject;
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
      break;
    }
    case "text": {
      const text = obj as TextObject;
      ctx.font = `${text.fontSize}px ${text.fontFamily}`;
      ctx.fillStyle = text.strokeColor;
      ctx.globalAlpha = text.opacity;
      ctx.fillText(text.text, text.x, text.y);
      break;
    }
  }
  ctx.restore();
}

function drawSelectionBox(ctx: CanvasRenderingContext2D, obj: WhiteboardObject) {
  ctx.save();
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  const pad = 6;
  let x = 0, y = 0, w = 0, h = 0;

  if (obj.type === "pen") {
    const pen = obj as PenObject;
    const xs = pen.points.map((p) => p.x);
    const ys = pen.points.map((p) => p.y);
    x = Math.min(...xs) - pad;
    y = Math.min(...ys) - pad;
    w = Math.max(...xs) - x + pad * 2 - pad;
    h = Math.max(...ys) - y + pad * 2 - pad;
  } else if (obj.type === "rectangle") {
    const r = obj as RectangleObject;
    x = Math.min(r.x, r.x + r.width) - pad;
    y = Math.min(r.y, r.y + r.height) - pad;
    w = Math.abs(r.width) + pad * 2;
    h = Math.abs(r.height) + pad * 2;
  } else if (obj.type === "circle") {
    const c = obj as CircleObject;
    x = c.x - Math.abs(c.radiusX) - pad;
    y = c.y - Math.abs(c.radiusY) - pad;
    w = Math.abs(c.radiusX) * 2 + pad * 2;
    h = Math.abs(c.radiusY) * 2 + pad * 2;
  } else if (obj.type === "line") {
    const l = obj as LineObject;
    x = Math.min(l.x, l.x2) - pad;
    y = Math.min(l.y, l.y2) - pad;
    w = Math.abs(l.x2 - l.x) + pad * 2;
    h = Math.abs(l.y2 - l.y) + pad * 2;
  } else if (obj.type === "text") {
    const t = obj as TextObject;
    x = t.x - pad;
    y = t.y - t.fontSize - pad;
    w = t.text.length * t.fontSize * 0.6 + pad * 2;
    h = t.fontSize + pad * 2;
  }

  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

export function Canvas({ onObjectCommit, onObjectDelete }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const startPoint = useRef<Point>({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0, y: 0, visible: false,
  });
  const textRef = useRef<HTMLInputElement>(null);

  const {
    objects,
    drawingObject,
    activeTool,
    selectedId,
    cursors,
    setDrawingObject,
    commitDrawingObject,
    createPenObject,
    createRectangleObject,
    createCircleObject,
    createLineObject,
    createTextObject,
    deleteObject,
    setSelectedId,
  } = useCanvasStore();

  // Redraw everything
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sorted = [...objects].sort((a, b) => a.zIndex - b.zIndex);
    for (const obj of sorted) {
      drawObject(ctx, obj);
    }

    if (drawingObject) {
      drawObject(ctx, drawingObject);
    }

    // Selection box
    if (selectedId) {
      const selected = objects.find((o) => o.id === selectedId);
      if (selected) drawSelectionBox(ctx, selected);
    }

    // Remote cursors
    Object.values(cursors).forEach((cursor) => {
      ctx.save();
      ctx.fillStyle = cursor.color;
      ctx.beginPath();
      ctx.moveTo(cursor.x, cursor.y);
      ctx.lineTo(cursor.x + 12, cursor.y + 4);
      ctx.lineTo(cursor.x + 4, cursor.y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.font = "11px Inter, sans-serif";
      ctx.fillStyle = cursor.color;
      ctx.fillText(cursor.name, cursor.x + 14, cursor.y + 4);
      ctx.restore();
    });
  }, [objects, drawingObject, selectedId, cursors]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Resize canvas to fill container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      redraw();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [redraw]);

  const getPos = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitTest = (point: Point): WhiteboardObject | null => {
    const sorted = [...objects].sort((a, b) => b.zIndex - a.zIndex);
    for (const obj of sorted) {
      if (obj.type === "rectangle") {
        const r = obj as RectangleObject;
        const minX = Math.min(r.x, r.x + r.width);
        const maxX = Math.max(r.x, r.x + r.width);
        const minY = Math.min(r.y, r.y + r.height);
        const maxY = Math.max(r.y, r.y + r.height);
        if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) return obj;
      } else if (obj.type === "circle") {
        const c = obj as CircleObject;
        const dx = (point.x - c.x) / Math.max(Math.abs(c.radiusX), 1);
        const dy = (point.y - c.y) / Math.max(Math.abs(c.radiusY), 1);
        if (dx * dx + dy * dy <= 1) return obj;
      } else if (obj.type === "pen") {
        const pen = obj as PenObject;
        for (const p of pen.points) {
          if (Math.hypot(point.x - p.x, point.y - p.y) < 8) return obj;
        }
      } else if (obj.type === "text") {
        const t = obj as TextObject;
        if (point.x >= t.x && point.x <= t.x + t.text.length * t.fontSize * 0.6
          && point.y >= t.y - t.fontSize && point.y <= t.y + 4) return obj;
      } else if (obj.type === "line") {
        const l = obj as LineObject;
        const dx = l.x2 - l.x, dy = l.y2 - l.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) return null;
        const t = ((point.x - l.x) * dx + (point.y - l.y) * dy) / (len * len);
        const tc = Math.max(0, Math.min(1, t));
        const cx = l.x + tc * dx, cy = l.y + tc * dy;
        if (Math.hypot(point.x - cx, point.y - cy) < 8) return obj;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const pos = getPos(e);
    isDrawing.current = true;
    startPoint.current = pos;

    if (activeTool === "select") {
      const hit = hitTest(pos);
      setSelectedId(hit?.id ?? null);
      return;
    }

    if (activeTool === "eraser") {
      const hit = hitTest(pos);
      if (hit) {
        deleteObject(hit.id);
        onObjectDelete?.(hit.id);
      }
      return;
    }

    if (activeTool === "text") {
      setTextInput({ x: pos.x, y: pos.y, visible: true });
      setTimeout(() => textRef.current?.focus(), 0);
      isDrawing.current = false;
      return;
    }

    if (activeTool === "pen") setDrawingObject(createPenObject(pos));
    else if (activeTool === "rectangle") setDrawingObject(createRectangleObject(pos.x, pos.y));
    else if (activeTool === "circle") setDrawingObject(createCircleObject(pos.x, pos.y));
    else if (activeTool === "line") setDrawingObject(createLineObject(pos.x, pos.y));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current || !drawingObject) return;
    const pos = getPos(e);

    if (activeTool === "pen") {
      const pen = drawingObject as PenObject;
      const updated = { ...pen, points: [...pen.points, pos] };
      setDrawingObject(updated);
    } else if (activeTool === "rectangle") {
      const updated = {
        ...(drawingObject as RectangleObject),
        width: pos.x - startPoint.current.x,
        height: pos.y - startPoint.current.y,
      };
      setDrawingObject(updated);
    } else if (activeTool === "circle") {
      const updated = {
        ...(drawingObject as CircleObject),
        radiusX: (pos.x - startPoint.current.x) / 2,
        radiusY: (pos.y - startPoint.current.y) / 2,
        x: startPoint.current.x + (pos.x - startPoint.current.x) / 2,
        y: startPoint.current.y + (pos.y - startPoint.current.y) / 2,
      };
      setDrawingObject(updated);
    } else if (activeTool === "line") {
      const updated = { ...(drawingObject as LineObject), x2: pos.x, y2: pos.y };
      setDrawingObject(updated);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (activeTool === "eraser" || activeTool === "select" || activeTool === "text") return;

    const committed = commitDrawingObject();
    if (committed) {
      onObjectCommit?.(committed);
    }
  };

  const handleTextSubmit = (text: string) => {
    if (!text.trim()) {
      setTextInput({ x: 0, y: 0, visible: false });
      return;
    }
    const obj = createTextObject(textInput.x, textInput.y + 16, text);
    useCanvasStore.getState().addObject(obj);
    onObjectCommit?.(obj);
    setTextInput({ x: 0, y: 0, visible: false });
  };

  const cursor = activeTool === "pen" ? "crosshair"
    : activeTool === "eraser" ? "cell"
    : activeTool === "text" ? "text"
    : activeTool === "select" ? "default"
    : "crosshair";

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white">
      <canvas
        ref={canvasRef}
        style={{ cursor, touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="absolute inset-0"
      />
      {textInput.visible && (
        <input
          ref={textRef}
          className="absolute bg-transparent border-none outline-none text-base font-sans"
          style={{ left: textInput.x, top: textInput.y, minWidth: 100 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleTextSubmit(e.currentTarget.value);
            if (e.key === "Escape") setTextInput({ x: 0, y: 0, visible: false });
          }}
          onBlur={(e) => handleTextSubmit(e.target.value)}
          placeholder="Type here…"
        />
      )}
    </div>
  );
}
