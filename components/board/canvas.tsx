"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useCanvasStore } from "@/hooks/use-canvas-store";
import { generateId } from "@/lib/utils";
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
  onCursorMove?: (x: number, y: number) => void;
  canEdit?: boolean;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const ERASER_RADIUS = 15;

// ─── Draw helpers ─────────────────────────────────────────────────────────────

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

// Hit test for selection (strict bounds)
function hitTest(objects: WhiteboardObject[], point: Point): WhiteboardObject | null {
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
      if (len === 0) continue;
      const t = ((point.x - l.x) * dx + (point.y - l.y) * dy) / (len * len);
      const tc = Math.max(0, Math.min(1, t));
      const cx = l.x + tc * dx, cy = l.y + tc * dy;
      if (Math.hypot(point.x - cx, point.y - cy) < 8) return obj;
    }
  }
  return null;
}

// Hit test for non-pen objects with a larger eraser radius
function hitTestEraser(obj: WhiteboardObject, point: Point, radius: number): boolean {
  if (obj.type === "rectangle") {
    const r = obj as RectangleObject;
    return point.x >= Math.min(r.x, r.x + r.width) - radius
      && point.x <= Math.max(r.x, r.x + r.width) + radius
      && point.y >= Math.min(r.y, r.y + r.height) - radius
      && point.y <= Math.max(r.y, r.y + r.height) + radius;
  }
  if (obj.type === "circle") {
    const c = obj as CircleObject;
    const rX = Math.max(Math.abs(c.radiusX), 1);
    const rY = Math.max(Math.abs(c.radiusY), 1);
    const dx = (point.x - c.x) / rX;
    const dy = (point.y - c.y) / rY;
    const expansion = 1 + radius / Math.max(rX, rY);
    return dx * dx + dy * dy <= expansion * expansion;
  }
  if (obj.type === "text") {
    const t = obj as TextObject;
    return point.x >= t.x - radius && point.x <= t.x + t.text.length * t.fontSize * 0.6 + radius
      && point.y >= t.y - t.fontSize - radius && point.y <= t.y + 4 + radius;
  }
  if (obj.type === "line") {
    const l = obj as LineObject;
    const dx = l.x2 - l.x, dy = l.y2 - l.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return false;
    const t = ((point.x - l.x) * dx + (point.y - l.y) * dy) / (len * len);
    const tc = Math.max(0, Math.min(1, t));
    return Math.hypot(point.x - (l.x + tc * dx), point.y - (l.y + tc * dy)) < radius;
  }
  return false;
}

// Split a pen stroke at erased points, returning 0-N new strokes
function splitPenAtErase(pen: PenObject, erasePos: Point, radius: number): PenObject[] {
  const segments: Point[][] = [];
  let current: Point[] = [];

  for (const pt of pen.points) {
    if (Math.hypot(pt.x - erasePos.x, pt.y - erasePos.y) > radius) {
      current.push(pt);
    } else {
      if (current.length >= 2) segments.push([...current]);
      current = [];
    }
  }
  if (current.length >= 2) segments.push(current);

  return segments.map((points) => ({ ...pen, id: generateId(), points }));
}

// ─── Canvas Component ─────────────────────────────────────────────────────────

export function Canvas({ onObjectCommit, onObjectDelete, onCursorMove, canEdit = true }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const startPoint = useRef<Point>({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0, y: 0, visible: false,
  });
  const textRef = useRef<HTMLInputElement>(null);

  // Camera (pan + zoom)
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef<Camera>(camera);
  useEffect(() => { cameraRef.current = camera; });

  // Panning state
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const isSpaceDown = useRef(false);

  // Touch state for two-finger pinch/pan
  const lastTouchesRef = useRef<{ clientX: number; clientY: number }[]>([]);

  // Eraser drag state
  const eraserWorked = useRef(false);

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
    setSelectedId,
    pushHistory,
  } = useCanvasStore();

  // ── World coordinate conversion ──────────────────────────────────────────
  const getWorldPos = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    return {
      x: (clientX - rect.left - cam.x) / cam.zoom,
      y: (clientY - rect.top - cam.y) / cam.zoom,
    };
  }, []);

  // ── Redraw ───────────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply camera transform for all world-space drawing
    ctx.save();
    ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.x, camera.y);

    const sorted = [...objects].sort((a, b) => a.zIndex - b.zIndex);
    for (const obj of sorted) {
      drawObject(ctx, obj);
    }

    if (drawingObject) {
      drawObject(ctx, drawingObject);
    }

    if (selectedId) {
      const selected = objects.find((o) => o.id === selectedId);
      if (selected) drawSelectionBox(ctx, selected);
    }

    ctx.restore();

    // Draw remote cursors in screen space (fixed size regardless of zoom)
    Object.values(cursors).forEach((cursor) => {
      const sx = cursor.x * camera.zoom + camera.x;
      const sy = cursor.y * camera.zoom + camera.y;
      ctx.save();
      ctx.fillStyle = cursor.color;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 12, sy + 4);
      ctx.lineTo(sx + 4, sy + 12);
      ctx.closePath();
      ctx.fill();
      ctx.font = "11px Inter, sans-serif";
      ctx.fillStyle = cursor.color;
      ctx.fillText(cursor.name, sx + 14, sy + 4);
      ctx.restore();
    });
  }, [objects, drawingObject, selectedId, cursors, camera]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // ── Resize observer ───────────────────────────────────────────────────────
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

  // ── Wheel zoom (imperative, passive:false required for preventDefault) ────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = cameraRef.current;
      const ZOOM_SPEED = 0.0012;
      const newZoom = Math.max(0.05, Math.min(20, cam.zoom * (1 - e.deltaY * ZOOM_SPEED)));
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      // Keep the point under the cursor fixed in world space
      const newX = px - (px - cam.x) * (newZoom / cam.zoom);
      const newY = py - (py - cam.y) * (newZoom / cam.zoom);
      setCamera({ x: newX, y: newY, zoom: newZoom });
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  // ── Space key for temporary pan mode ─────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        isSpaceDown.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") isSpaceDown.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // ── Erase at a world position ─────────────────────────────────────────────
  const performErase = useCallback((pos: Point) => {
    const store = useCanvasStore.getState();
    const objs = store.objects;

    let newObjects = [...objs];
    let changed = false;
    const toDelete: string[] = [];
    const toAdd: WhiteboardObject[] = [];

    for (const obj of objs) {
      if (obj.type === "pen") {
        const pen = obj as PenObject;
        const hasNearby = pen.points.some(
          (pt) => Math.hypot(pt.x - pos.x, pt.y - pos.y) <= ERASER_RADIUS
        );
        if (hasNearby) {
          const segments = splitPenAtErase(pen, pos, ERASER_RADIUS);
          newObjects = newObjects.filter((o) => o.id !== pen.id);
          toDelete.push(pen.id);
          for (const seg of segments) {
            newObjects.push(seg);
            toAdd.push(seg);
          }
          changed = true;
        }
      } else {
        if (hitTestEraser(obj, pos, ERASER_RADIUS)) {
          newObjects = newObjects.filter((o) => o.id !== obj.id);
          toDelete.push(obj.id);
          changed = true;
        }
      }
    }

    if (changed) {
      useCanvasStore.setState({ objects: newObjects, isDirty: true });
      eraserWorked.current = true;
      for (const id of toDelete) onObjectDelete?.(id);
      for (const obj of toAdd) onObjectCommit?.(obj);
    }
  }, [onObjectDelete, onObjectCommit]);

  // ── Shared pointer-down logic ─────────────────────────────────────────────
  const handlePointerDown = useCallback((clientX: number, clientY: number, button: number) => {
    const isPanMode = activeTool === "pan" || isSpaceDown.current || button === 1;

    if (isPanMode) {
      isPanning.current = true;
      const cam = cameraRef.current;
      panStart.current = { x: clientX, y: clientY, camX: cam.x, camY: cam.y };
      return;
    }

    if (!canEdit) return;

    const pos = getWorldPos(clientX, clientY);
    isDrawing.current = true;
    startPoint.current = pos;

    if (activeTool === "select") {
      const hit = hitTest(useCanvasStore.getState().objects, pos);
      setSelectedId(hit?.id ?? null);
      return;
    }

    if (activeTool === "eraser") {
      performErase(pos);
      return;
    }

    if (activeTool === "text") {
      const cam = cameraRef.current;
      // Text input appears at screen position
      const screenX = pos.x * cam.zoom + cam.x;
      const screenY = pos.y * cam.zoom + cam.y;
      setTextInput({ x: screenX, y: screenY, visible: true });
      setTimeout(() => textRef.current?.focus(), 0);
      isDrawing.current = false;
      return;
    }

    if (activeTool === "pen") setDrawingObject(createPenObject(pos));
    else if (activeTool === "rectangle") setDrawingObject(createRectangleObject(pos.x, pos.y));
    else if (activeTool === "circle") setDrawingObject(createCircleObject(pos.x, pos.y));
    else if (activeTool === "line") setDrawingObject(createLineObject(pos.x, pos.y));
  }, [activeTool, canEdit, getWorldPos, setSelectedId, performErase, setDrawingObject,
      createPenObject, createRectangleObject, createCircleObject, createLineObject]);

  // ── Shared pointer-move logic ─────────────────────────────────────────────
  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (isPanning.current) {
      const dx = clientX - panStart.current.x;
      const dy = clientY - panStart.current.y;
      setCamera({ x: panStart.current.camX + dx, y: panStart.current.camY + dy, zoom: cameraRef.current.zoom });
      return;
    }

    const pos = getWorldPos(clientX, clientY);
    onCursorMove?.(pos.x, pos.y);

    if (!canEdit) return;

    // Erase while dragging
    if (activeTool === "eraser" && isDrawing.current) {
      performErase(pos);
      return;
    }

    if (!isDrawing.current || !drawingObject) return;

    if (activeTool === "pen") {
      const pen = drawingObject as PenObject;
      setDrawingObject({ ...pen, points: [...pen.points, pos] });
    } else if (activeTool === "rectangle") {
      setDrawingObject({
        ...(drawingObject as RectangleObject),
        width: pos.x - startPoint.current.x,
        height: pos.y - startPoint.current.y,
      });
    } else if (activeTool === "circle") {
      setDrawingObject({
        ...(drawingObject as CircleObject),
        radiusX: (pos.x - startPoint.current.x) / 2,
        radiusY: (pos.y - startPoint.current.y) / 2,
        x: startPoint.current.x + (pos.x - startPoint.current.x) / 2,
        y: startPoint.current.y + (pos.y - startPoint.current.y) / 2,
      });
    } else if (activeTool === "line") {
      setDrawingObject({ ...(drawingObject as LineObject), x2: pos.x, y2: pos.y });
    }
  }, [activeTool, canEdit, drawingObject, getWorldPos, onCursorMove, performErase, setDrawingObject]);

  // ── Shared pointer-up logic ───────────────────────────────────────────────
  const handlePointerUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    // Finalize drag-erase with a single history push
    if (activeTool === "eraser") {
      if (eraserWorked.current) {
        eraserWorked.current = false;
        pushHistory(useCanvasStore.getState().objects);
      }
      return;
    }

    if (activeTool === "select" || activeTool === "text" || activeTool === "pan") return;

    const committed = commitDrawingObject();
    if (committed) onObjectCommit?.(committed);
  }, [activeTool, commitDrawingObject, onObjectCommit, pushHistory]);

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    handlePointerDown(e.clientX, e.clientY, e.button);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    handlePointerUp();
  };

  // ── Touch handlers ────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      handlePointerDown(t.clientX, t.clientY, 0);
      lastTouchesRef.current = [{ clientX: t.clientX, clientY: t.clientY }];
    } else if (e.touches.length === 2) {
      // Cancel any active drawing for pinch/pan
      isDrawing.current = false;
      setDrawingObject(null);
      isPanning.current = false;
      lastTouchesRef.current = [
        { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY },
        { clientX: e.touches[1].clientX, clientY: e.touches[1].clientY },
      ];
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      handlePointerMove(t.clientX, t.clientY);
      lastTouchesRef.current = [{ clientX: t.clientX, clientY: t.clientY }];
    } else if (e.touches.length === 2) {
      const prev = lastTouchesRef.current;
      if (prev.length !== 2) return;

      const [t1, t2] = [e.touches[0], e.touches[1]];
      const [p1, p2] = prev;

      const prevDist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scale = prevDist > 0 ? newDist / prevDist : 1;

      const prevMidX = (p1.clientX + p2.clientX) / 2;
      const prevMidY = (p1.clientY + p2.clientY) / 2;
      const newMidX = (t1.clientX + t2.clientX) / 2;
      const newMidY = (t1.clientY + t2.clientY) / 2;

      setCamera((cam) => {
        const newZoom = Math.max(0.05, Math.min(20, cam.zoom * scale));
        const canvas = canvasRef.current;
        const rect = canvas?.getBoundingClientRect();
        if (!rect) return cam;
        const px = prevMidX - rect.left;
        const py = prevMidY - rect.top;
        // Zoom toward midpoint, then apply pan delta
        const zoomedX = px - (px - cam.x) * (newZoom / cam.zoom);
        const zoomedY = py - (py - cam.y) * (newZoom / cam.zoom);
        return {
          x: zoomedX + (newMidX - prevMidX),
          y: zoomedY + (newMidY - prevMidY),
          zoom: newZoom,
        };
      });

      lastTouchesRef.current = [
        { clientX: t1.clientX, clientY: t1.clientY },
        { clientX: t2.clientX, clientY: t2.clientY },
      ];
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      handlePointerUp();
      lastTouchesRef.current = [];
    } else if (e.touches.length === 1) {
      // One finger lifted from a two-finger gesture — restart single-touch tracking
      lastTouchesRef.current = [
        { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY },
      ];
    }
  };

  // ── Text submit ───────────────────────────────────────────────────────────
  const handleTextSubmit = (text: string) => {
    if (!text.trim()) {
      setTextInput({ x: 0, y: 0, visible: false });
      return;
    }
    const cam = cameraRef.current;
    const worldX = (textInput.x - cam.x) / cam.zoom;
    const worldY = (textInput.y + 16 - cam.y) / cam.zoom;
    const obj = createTextObject(worldX, worldY, text);
    useCanvasStore.getState().addObject(obj);
    onObjectCommit?.(obj);
    setTextInput({ x: 0, y: 0, visible: false });
  };

  const isPanTool = activeTool === "pan";
  const cursor = isPanning.current
    ? "grabbing"
    : isPanTool || isSpaceDown.current
    ? "grab"
    : activeTool === "pen"
    ? "crosshair"
    : activeTool === "eraser"
    ? "cell"
    : activeTool === "text"
    ? "text"
    : activeTool === "select"
    ? "default"
    : "crosshair";

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{ cursor, touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="absolute inset-0"
      />

      {/* View-only overlay message */}
      {!canEdit && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800/80 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none select-none">
          View only — editing is disabled
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-white/80 border border-zinc-200 rounded-md px-2 py-1 text-xs text-zinc-500 select-none pointer-events-none">
        {Math.round(camera.zoom * 100)}%
      </div>

      {/* Reset zoom button */}
      <button
        className="absolute bottom-10 right-4 mt-1 bg-white border border-zinc-200 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 transition-colors"
        onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
        title="Reset zoom (100%)"
      >
        Reset
      </button>

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
