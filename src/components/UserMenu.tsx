import { useState, useRef, useEffect } from "react"
import type { User } from "../types/user"

interface Props {
  user: User
  onLogout: () => void
  onAdmin: () => void
}

export function UserMenu({ user, onLogout, onAdmin }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-[0.75rem] font-medium transition-all hover:bg-[var(--border-light)]"
        style={{ color: "var(--ink-dim)" }}
      >
        {user.username}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg py-1 shadow-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="border-b border-[var(--border-light)] px-3 py-2 text-[0.6875rem] text-[var(--ink-muted)]">
            {user.email}
            <br />
            <span className={user.role !== "user" ? "text-[var(--accent)]" : ""}>{user.role === "admin" ? "管理员" : user.role === "project_admin" ? "项目管理员" : "普通用户"}</span>
          </div>
          {user.role === "admin" && (
            <button
              onClick={() => { setOpen(false); onAdmin() }}
              className="flex w-full cursor-pointer items-center px-3 py-2 text-left text-[0.75rem] transition-all hover:bg-[var(--border-light)]"
              style={{ color: "var(--ink)" }}
            >
              管理员设置
            </button>
          )}
          <button
            onClick={() => { setOpen(false); onLogout() }}
            className="flex w-full cursor-pointer items-center px-3 py-2 text-left text-[0.75rem] text-red-500 transition-all hover:bg-red-50"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  )
}
