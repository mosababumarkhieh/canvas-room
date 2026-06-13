"use client";

import { create } from "zustand";
import type {
  WhiteboardObject,
  DrawingTool,
  Point,
  PenObject,
  RectangleObject,
  CircleObject,
  LineObject,
  TextObject,
  CursorPosition,
  PresenceUser,
} from "@/types";
import { generateId } from "@/lib/utils";

const MAX_HISTORY = 50;

interface CanvasStore {
  // Objects
  objects: WhiteboardObject[];
  selectedId: string | null;

  // Drawing state
  activeTool: DrawingTool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;

  // In-progress drawing (not yet committed to objects list)
  drawingObject: WhiteboardObject | null;

  // Undo/redo
  history: WhiteboardObject[][];
  historyIndex: number;

  // Collaboration
  cursors: Record<string, CursorPosition>;
  presenceUsers: PresenceUser[];

  // Dirty flag for autosave
  isDirty: boolean;

  // Actions
  setObjects: (objects: WhiteboardObject[]) => void;
  addObject: (object: WhiteboardObject) => void;
  updateObject: (id: string, update: Partial<WhiteboardObject>) => void;
  deleteObject: (id: string) => void;
  clearBoard: () => void;

  setDrawingObject: (object: WhiteboardObject | null) => void;
  commitDrawingObject: () => WhiteboardObject | null;

  setActiveTool: (tool: DrawingTool) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  setFontSize: (size: number) => void;
  setSelectedId: (id: string | null) => void;

  undo: () => WhiteboardObject[] | null;
  redo: () => WhiteboardObject[] | null;
  pushHistory: (objects: WhiteboardObject[]) => void;

  updateCursor: (cursor: CursorPosition) => void;
  removeCursor: (userId: string) => void;
  setPresenceUsers: (users: PresenceUser[]) => void;

  setDirty: (dirty: boolean) => void;

  // Object creation helpers
  createPenObject: (startPoint: Point) => PenObject;
  createRectangleObject: (x: number, y: number) => RectangleObject;
  createCircleObject: (x: number, y: number) => CircleObject;
  createLineObject: (x: number, y: number) => LineObject;
  createTextObject: (x: number, y: number, text: string) => TextObject;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  objects: [],
  selectedId: null,
  activeTool: "pen",
  strokeColor: "#1e1e1e",
  fillColor: "transparent",
  strokeWidth: 2,
  opacity: 1,
  fontSize: 16,
  drawingObject: null,
  history: [],
  historyIndex: -1,
  cursors: {},
  presenceUsers: [],
  isDirty: false,

  setObjects: (objects) => {
    set({ objects, history: [objects], historyIndex: 0, isDirty: false });
  },

  addObject: (object) => {
    const objects = [...get().objects, object];
    get().pushHistory(objects);
    set({ objects, isDirty: true });
  },

  updateObject: (id, update) => {
    const objects = get().objects.map((o) =>
      o.id === id ? ({ ...o, ...update } as WhiteboardObject) : o
    );
    get().pushHistory(objects);
    set({ objects, isDirty: true });
  },

  deleteObject: (id) => {
    const objects = get().objects.filter((o) => o.id !== id);
    get().pushHistory(objects);
    set({ objects, selectedId: null, isDirty: true });
  },

  clearBoard: () => {
    get().pushHistory([]);
    set({ objects: [], selectedId: null, isDirty: true });
  },

  setDrawingObject: (drawingObject) => set({ drawingObject }),

  commitDrawingObject: () => {
    const { drawingObject } = get();
    if (!drawingObject) return null;
    get().addObject(drawingObject);
    set({ drawingObject: null });
    return drawingObject;
  },

  setActiveTool: (activeTool) => set({ activeTool, selectedId: null }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillColor: (fillColor) => set({ fillColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setOpacity: (opacity) => set({ opacity }),
  setFontSize: (fontSize) => set({ fontSize }),
  setSelectedId: (selectedId) => set({ selectedId }),

  pushHistory: (objects) => {
    const { history, historyIndex } = get();
    const newHistory = [...history.slice(0, historyIndex + 1), objects].slice(-MAX_HISTORY);
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return null;
    const next = historyIndex - 1;
    const objects = history[next];
    set({ objects, historyIndex: next, isDirty: true });
    return objects;
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return null;
    const next = historyIndex + 1;
    const objects = history[next];
    set({ objects, historyIndex: next, isDirty: true });
    return objects;
  },

  updateCursor: (cursor) => {
    set((state) => ({
      cursors: { ...state.cursors, [cursor.userId]: cursor },
    }));
  },

  removeCursor: (userId) => {
    set((state) => {
      const cursors = { ...state.cursors };
      delete cursors[userId];
      return { cursors };
    });
  },

  setPresenceUsers: (presenceUsers) => set({ presenceUsers }),

  setDirty: (isDirty) => set({ isDirty }),

  createPenObject: (startPoint) => ({
    id: generateId(),
    type: "pen",
    x: startPoint.x,
    y: startPoint.y,
    points: [startPoint],
    strokeColor: get().strokeColor,
    strokeWidth: get().strokeWidth,
    fillColor: "transparent",
    opacity: get().opacity,
    zIndex: get().objects.length,
  }),

  createRectangleObject: (x, y) => ({
    id: generateId(),
    type: "rectangle",
    x,
    y,
    width: 0,
    height: 0,
    strokeColor: get().strokeColor,
    strokeWidth: get().strokeWidth,
    fillColor: get().fillColor,
    opacity: get().opacity,
    zIndex: get().objects.length,
  }),

  createCircleObject: (x, y) => ({
    id: generateId(),
    type: "circle",
    x,
    y,
    radiusX: 0,
    radiusY: 0,
    strokeColor: get().strokeColor,
    strokeWidth: get().strokeWidth,
    fillColor: get().fillColor,
    opacity: get().opacity,
    zIndex: get().objects.length,
  }),

  createLineObject: (x, y) => ({
    id: generateId(),
    type: "line",
    x,
    y,
    x2: x,
    y2: y,
    strokeColor: get().strokeColor,
    strokeWidth: get().strokeWidth,
    fillColor: "transparent",
    opacity: get().opacity,
    zIndex: get().objects.length,
  }),

  createTextObject: (x, y, text) => ({
    id: generateId(),
    type: "text",
    x,
    y,
    text,
    fontSize: get().fontSize,
    fontFamily: "Inter, sans-serif",
    strokeColor: get().strokeColor,
    strokeWidth: 0,
    fillColor: "transparent",
    opacity: get().opacity,
    zIndex: get().objects.length,
  }),
}));
