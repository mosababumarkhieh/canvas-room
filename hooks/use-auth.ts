"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/types";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setState({ user: data.user, loading: false });
      } else {
        setState({ user: null, loading: false });
      }
    } catch {
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Login failed");
    setState({ user: data.user, loading: false });
    return data.user as AuthUser;
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Registration failed");
    setState({ user: data.user, loading: false });
    return data.user as AuthUser;
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({ user: null, loading: false });
    router.push("/login");
  };

  return { ...state, login, register, logout, refetch: fetchUser };
}
