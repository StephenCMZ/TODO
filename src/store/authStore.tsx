import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { User } from "../types/user"

const TOKEN_KEY = "todo_token"

interface AuthContextValue {
  state: "loading" | "unauthenticated" | "authenticated"
  user: User | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  forgotPassword: (email: string) => Promise<string>
  resetPassword: (token: string, password: string) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function apiPost<T>(path: string, body: unknown): Promise<T> {
  return fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => {
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Request failed")
    return data as T
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "unauthenticated" | "authenticated">("loading")
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setState("unauthenticated")
      return
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Invalid token")
        const u = await res.json()
        setUser(u)
        setState("authenticated")
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setState("unauthenticated")
      })

    const onTokenRemoved = () => {
      const t = localStorage.getItem(TOKEN_KEY)
      if (!t) {
        setUser(null)
        setState("unauthenticated")
      }
    }
    window.addEventListener("auth:token-removed", onTokenRemoved)
    return () => window.removeEventListener("auth:token-removed", onTokenRemoved)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiPost<{ user: User; token: string }>("/login", { username, password })
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    setState("authenticated")
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    const data = await apiPost<{ user: User; token: string }>("/register", { username, email, password })
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    setState("authenticated")
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setState("unauthenticated")
  }, [])

  const forgotPassword = useCallback(async (email: string) => {
    const data = await apiPost<{ ok: boolean; resetToken?: string }>("/forgot-password", { email })
    return data.resetToken || ""
  }, [])

  const resetPassword = useCallback(async (token: string, password: string) => {
    await apiPost("/reset-password", { token, password })
  }, [])

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Invalid token")
      const u = await res.json()
      setUser(u)
    } catch {
      // token invalid, logout will happen naturally
    }
  }, [])

  return (
    <AuthContext.Provider value={{ state, user, login, register, logout, forgotPassword, resetPassword, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
