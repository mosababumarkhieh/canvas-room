"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Read once on mount — safe inside useState initializer (client-only).
  const [callbackUrl] = useState<string>(() => {
    if (typeof window === "undefined") return "/dashboard";
    const p = new URLSearchParams(window.location.search).get("callbackUrl");
    // Only allow relative paths to prevent open-redirect attacks.
    return p && p.startsWith("/") ? p : "/dashboard";
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push(callbackUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <Pencil className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-zinc-900 tracking-tight">CanvasRoom</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-zinc-900">Welcome back</h1>
            <p className="text-sm text-zinc-500 mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-indigo-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400">
          By signing in you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
