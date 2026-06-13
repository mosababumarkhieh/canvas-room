import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CanvasRoom — Collaborative Whiteboard",
  description:
    "Real-time collaborative whiteboard for teams. Draw, diagram, and brainstorm together.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
