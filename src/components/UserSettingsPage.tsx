import { useState } from "react"
import { useAuth } from "../store/authStore"

function apiPut<T>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem("todo_token")
  return fetch(`/api/auth${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Request failed")
    return data as T
  })
}

const inputCls =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[0.8125rem] text-[var(--ink)] outline-none focus:border-[var(--accent)]"

const btnCls =
  "shrink-0 whitespace-nowrap cursor-pointer rounded-lg bg-[var(--accent)] px-4 py-2 text-[0.8125rem] font-medium text-white transition-all hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-40"

export function UserSettingsPage({ onBack }: { onBack: () => void }) {
  const { user, refreshUser } = useAuth()
  const [message, setMessage] = useState("")
  const [username, setUsername] = useState(user?.username ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState<"username" | "email" | "password" | null>(null)

  const handleSaveUsername = async () => {
    if (username.length < 2 || username.length > 20) {
      setMessage("用户名长度需在2-20个字符之间")
      return
    }
    setSaving("username")
    try {
      await apiPut("/me/username", { username })
      await refreshUser()
      setMessage("用户名已更新")
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setSaving(null)
    }
  }

  const handleSaveEmail = async () => {
    if (!email) {
      setMessage("邮箱不能为空")
      return
    }
    setSaving("email")
    try {
      await apiPut("/me/email", { email })
      await refreshUser()
      setMessage("邮箱已更新")
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setSaving(null)
    }
  }

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword) {
      setMessage("请填写当前密码和新密码")
      return
    }
    if (newPassword.length < 6) {
      setMessage("密码至少6个字符")
      return
    }
    setSaving("password")
    try {
      await apiPut("/me/password", { currentPassword, newPassword })
      setCurrentPassword("")
      setNewPassword("")
      setMessage("密码已更新，正在重新登录…")
      // 服务端已使旧令牌失效（token_version +1），强制退出后回到登录页
      setTimeout(() => {
        localStorage.removeItem("todo_token")
        window.dispatchEvent(new CustomEvent("auth:token-removed"))
      }, 1200)
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="mx-auto max-w-[42rem] px-4">
      <header className="mb-6 flex items-baseline gap-3">
        <div>
          <h1 className="font-heading text-[2.5rem] font-medium italic leading-none tracking-[-0.03em] text-[var(--ink)]">
            用户设置
          </h1>
          <div className="mt-1 text-[0.7rem] font-medium uppercase tracking-[0.06em] text-[var(--ink-dim)]">
            个人资料 · 账号安全
          </div>
        </div>
        <button
          onClick={onBack}
          className="ml-auto cursor-pointer rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-[0.5rem] text-[0.8125rem] font-medium text-[var(--ink-dim)] transition-all hover:border-[var(--ink-muted)] hover:text-[var(--ink)]"
        >
          ← 返回
        </button>
      </header>

      {message && (
        <p className="mb-4 rounded-lg bg-blue-50 p-2 text-center text-[0.75rem] text-blue-600">{message}</p>
      )}

      <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <h2 className="mb-4 font-[var(--font-heading)] text-[1rem] italic text-[var(--ink)]">修改用户名</h2>
        <div className="flex items-center gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            placeholder="用户名（2-20个字符）"
            className={inputCls}
          />
          <button onClick={handleSaveUsername} disabled={saving !== null} className={btnCls}>
            保存
          </button>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <h2 className="mb-4 font-[var(--font-heading)] text-[1rem] italic text-[var(--ink)]">修改邮箱</h2>
        <div className="flex items-center gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            className={inputCls}
          />
          <button onClick={handleSaveEmail} disabled={saving !== null} className={btnCls}>
            保存
          </button>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <h2 className="mb-4 font-[var(--font-heading)] text-[1rem] italic text-[var(--ink)]">修改密码</h2>
        <div className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="当前密码"
            className={inputCls}
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="新密码（至少6位）"
            className={inputCls}
          />
          <button onClick={handleSavePassword} disabled={saving !== null} className={btnCls}>
            保存
          </button>
        </div>
      </section>
    </div>
  )
}
