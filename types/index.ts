// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  color: string;
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  color: string;
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

export type MemberRole = "OWNER" | "EDITOR" | "VIEWER";

export interface Room {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  isPublic: boolean;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string; email: string; color: string };
  members: RoomMember[];
  _count?: { members: number };
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  user: { id: string; name: string; email: string; color: string };
}

// ─── Whiteboard Objects ──────────────────────────────────────────────────────

export type DrawingTool =
  | "pen"
  | "eraser"
  | "rectangle"
  | "circle"
  | "line"
  | "text"
  | "select";

export type WhiteboardObjectType =
  | "pen"
  | "rectangle"
  | "circle"
  | "line"
  | "text";

export interface Point {
  x: number;
  y: number;
}

export interface BaseObject {
  id: string;
  type: WhiteboardObjectType;
  x: number;
  y: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  opacity: number;
  zIndex: number;
}

export interface PenObject extends BaseObject {
  type: "pen";
  points: Point[];
}

export interface RectangleObject extends BaseObject {
  type: "rectangle";
  width: number;
  height: number;
}

export interface CircleObject extends BaseObject {
  type: "circle";
  radiusX: number;
  radiusY: number;
}

export interface LineObject extends BaseObject {
  type: "line";
  x2: number;
  y2: number;
}

export interface TextObject extends BaseObject {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
}

export type WhiteboardObject =
  | PenObject
  | RectangleObject
  | CircleObject
  | LineObject
  | TextObject;

// ─── Socket Events ───────────────────────────────────────────────────────────

export interface CursorPosition {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

export interface PresenceUser {
  userId: string;
  name: string;
  color: string;
  socketId: string;
}

export interface DrawingUpdate {
  object: WhiteboardObject;
  roomId: string;
}

export interface ObjectDelete {
  objectId: string;
  roomId: string;
}

// Socket event map (client → server)
export interface ClientToServerEvents {
  "room:join": (payload: { roomId: string; user: AuthUser }) => void;
  "room:leave": (roomId: string) => void;
  "cursor:move": (payload: { roomId: string; x: number; y: number }) => void;
  "object:draw": (payload: DrawingUpdate) => void;
  "object:update": (payload: DrawingUpdate) => void;
  "object:delete": (payload: ObjectDelete) => void;
  "board:clear": (roomId: string) => void;
}

// Socket event map (server → client)
export interface ServerToClientEvents {
  "room:state": (objects: WhiteboardObject[]) => void;
  "room:users": (users: PresenceUser[]) => void;
  "cursor:update": (cursor: CursorPosition) => void;
  "cursor:remove": (userId: string) => void;
  "object:draw": (object: WhiteboardObject) => void;
  "object:update": (object: WhiteboardObject) => void;
  "object:delete": (objectId: string) => void;
  "board:clear": () => void;
  error: (message: string) => void;
}

// ─── API Response ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}

export type ApiResponse<T> = T | ApiError;
