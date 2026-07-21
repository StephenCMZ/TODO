import { useState } from "react"

interface Props {
  onLogin: (username: string, password: string) => Promise<void>
  onSwitchToRegister: () => void
  onSwitchToForgot: () => void
  showRegister?: boolean
  showForgotPassword?: boolean
}

export function LoginPage({ onLogin, onSwitchToRegister, onSwitchToForgot, showRegister = true, showForgotPassword = true }: Props) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) { setError("请输入用户名和密码"); return }
    setBusy(true)
    setError("")
    try {
      await onLogin(username, password)
    } catch (err: any) {
      setError(err.message || "登录失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl p-8 shadow-lg" style={{ background: "var(--surface)" }}>
        <h1 className="mb-1 font-[var(--font-heading)] text-[2rem] italic text-[var(--ink)]">
          TODO<span className="text-[var(--accent)]">.</span>
        </h1>
        <p className="mb-6 text-[0.75rem] uppercase tracking-[0.06em] text-[var(--ink-dim)]">登录</p>

        {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-center text-[0.8125rem] text-red-600">{error}</p>}

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名或邮箱"
          autoFocus
          className="mb-3 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-[0.85rem] py-[0.55rem] text-[0.875rem] text-[var(--ink)] outline-none transition-[border-color] focus:border-[var(--accent)]"
        />
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-[0.85rem] py-[0.55rem] pr-9 text-[0.875rem] text-[var(--ink)] outline-none transition-[border-color] focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent px-1 py-1 text-[0.75rem] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            tabIndex={-1}
          >
            {showPassword ? "🙈" : "👁"}
          </button>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full cursor-pointer rounded-[var(--radius)] bg-[var(--accent)] px-5 py-[0.6rem] text-[0.875rem] font-semibold text-white transition-all disabled:opacity-50"
        >
          {busy ? "登录中..." : "登录"}
        </button>

        <div className="mt-4 flex justify-between text-[0.75rem]">
          {showRegister ? (
            <button type="button" onClick={onSwitchToRegister} className="cursor-pointer text-[var(--accent)] hover:underline">
              注册新账号
            </button>
          ) : <span />}
          {showForgotPassword ? (
            <button type="button" onClick={onSwitchToForgot} className="cursor-pointer text-[var(--ink-muted)] hover:underline">
              忘记密码
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
