import { useState } from "react"

interface Props {
  onResetPassword: (token: string, password: string) => Promise<void>
  onBackToLogin: () => void
  initialToken?: string
}

export function ResetPasswordPage({ onResetPassword, onBackToLogin, initialToken }: Props) {
  const [token, setToken] = useState(initialToken || "")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !password) { setError("请填写所有字段"); return }
    if (password.length < 6) { setError("密码至少6个字符"); return }
    setBusy(true)
    setError("")
    try {
      await onResetPassword(token, password)
      setDone(true)
    } catch (err: any) {
      setError(err.message || "重置失败")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-sm rounded-xl p-8 text-center shadow-lg" style={{ background: "var(--surface)" }}>
          <h1 className="mb-1 font-[var(--font-heading)] text-[2rem] italic text-[var(--ink)]">
            TODO<span className="text-[var(--accent)]">.</span>
          </h1>
          <p className="mb-6 text-[0.8125rem] text-[var(--ink-dim)]">密码已重置成功</p>
          <button onClick={onBackToLogin} className="cursor-pointer rounded-[var(--radius)] bg-[var(--accent)] px-5 py-[0.6rem] text-[0.875rem] font-semibold text-white">
            返回登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl p-8 shadow-lg" style={{ background: "var(--surface)" }}>
        <h1 className="mb-1 font-[var(--font-heading)] text-[2rem] italic text-[var(--ink)]">
          TODO<span className="text-[var(--accent)]">.</span>
        </h1>
        <p className="mb-6 text-[0.75rem] uppercase tracking-[0.06em] text-[var(--ink-dim)]">重置密码</p>

        {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-center text-[0.8125rem] text-red-600">{error}</p>}

        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="重置令牌"
          autoFocus
          className="mb-3 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-[0.85rem] py-[0.55rem] text-[0.875rem] text-[var(--ink)] outline-none transition-[border-color] focus:border-[var(--accent)]"
        />
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="新密码（至少6位）"
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
          {busy ? "重置中..." : "重置密码"}
        </button>

        <button type="button" onClick={onBackToLogin} className="mt-3 w-full cursor-pointer text-center text-[0.75rem] text-[var(--accent)] hover:underline">
          返回登录
        </button>
      </form>
    </div>
  )
}
