import { useState } from "react"

interface Props {
  onForgotPassword: (email: string) => Promise<string>
  onBackToLogin: () => void
  onShowReset: (token: string) => void
}

export function ForgotPasswordPage({ onForgotPassword, onBackToLogin, onShowReset }: Props) {
  const [email, setEmail] = useState("")
  const [done, setDone] = useState(false)
  const [resetToken, setResetToken] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError("请输入邮箱"); return }
    setBusy(true)
    setError("")
    try {
      const token = await onForgotPassword(email)
      setResetToken(token)
      setDone(true)
    } catch (err: any) {
      setError(err.message || "请求失败")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-sm rounded-xl p-8 shadow-lg" style={{ background: "var(--surface)" }}>
          <h1 className="mb-1 font-[var(--font-heading)] text-[2rem] italic text-[var(--ink)]">
            TODO<span className="text-[var(--accent)]">.</span>
          </h1>
          <p className="mb-4 text-[0.75rem] uppercase tracking-[0.06em] text-[var(--ink-dim)]">重置密码</p>
          {resetToken ? (
            <>
              <p className="mb-2 text-[0.8125rem] text-[var(--ink)]">重置令牌已生成：</p>
              <div className="mb-4 break-all rounded-lg bg-[var(--border-light)] p-3 font-mono text-[0.75rem] text-[var(--ink)]">{resetToken}</div>
              <p className="mb-4 text-[0.75rem] text-[var(--ink-muted)]">请复制此令牌，然后在重置密码页面使用。</p>
              <button
                onClick={() => onShowReset(resetToken)}
                className="w-full cursor-pointer rounded-[var(--radius)] bg-[var(--accent)] px-5 py-[0.6rem] text-[0.875rem] font-semibold text-white"
              >
                去重置密码
              </button>
            </>
          ) : (
            <p className="mb-4 text-[0.8125rem] text-[var(--ink-muted)]">如果该邮箱已注册，重置链接已发送（请检查邮箱）。</p>
          )}
          <button onClick={onBackToLogin} className="mt-3 w-full cursor-pointer text-center text-[0.75rem] text-[var(--accent)] hover:underline">
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
        <p className="mb-6 text-[0.75rem] uppercase tracking-[0.06em] text-[var(--ink-dim)]">忘记密码</p>

        {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-center text-[0.8125rem] text-red-600">{error}</p>}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="注册邮箱"
          autoFocus
          className="mb-4 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-[0.85rem] py-[0.55rem] text-[0.875rem] text-[var(--ink)] outline-none transition-[border-color] focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full cursor-pointer rounded-[var(--radius)] bg-[var(--accent)] px-5 py-[0.6rem] text-[0.875rem] font-semibold text-white transition-all disabled:opacity-50"
        >
          {busy ? "发送中..." : "获取重置令牌"}
        </button>

        <button type="button" onClick={onBackToLogin} className="mt-3 w-full cursor-pointer text-center text-[0.75rem] text-[var(--accent)] hover:underline">
          返回登录
        </button>
      </form>
    </div>
  )
}
