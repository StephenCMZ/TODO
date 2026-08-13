import { useState, useEffect, useCallback } from "react"
import type { AuditLog, User } from "../types/user"

interface Props {
  onBack: () => void
}

interface Settings {
  registrationEnabled: boolean
  forgotPasswordEnabled: boolean
  footerHtml: string
}

const ROLE_OPTIONS = [
  { value: "admin", label: "管理员", desc: "拥有所有权限" },
  { value: "project_admin", label: "项目管理员", desc: "支持项目管理" },
  { value: "user", label: "普通用户", desc: "支持查看或编辑任务" },
]

const ACTION_LABELS: Record<string, string> = {
  "auth.register": "注册",
  "auth.login": "登录",
  "auth.login_failed": "登录失败",
  "auth.forgot_password": "申请找回密码",
  "auth.reset_password": "重置密码",
  "project.create": "创建项目",
  "project.update": "修改项目",
  "project.delete": "删除项目",
  "project.member.add": "添加成员",
  "project.member.remove": "移除成员",
  "project.member.role": "修改成员角色",
  "todo.create": "新建任务",
  "todo.update": "编辑任务",
  "todo.delete": "删除任务",
  "todo.status": "变更状态",
  "todo.statuses": "修改状态节点",
  "todo.toggle": "勾选任务",
  "todo.clear_done": "清理已完成",
  "admin.settings": "更新设置",
  "admin.user.create": "创建用户",
  "admin.user.delete": "删除用户",
  "admin.user.toggle_active": "启用/禁用用户",
  "admin.user.reset_password": "重置用户密码",
  "admin.user.set_role": "修改用户角色",
  "admin.user.update_email": "修改用户邮箱",
  "admin.user.update_username": "修改用户名",
  "user.update_username": "修改用户名",
  "user.update_email": "修改邮箱",
  "user.update_password": "修改密码",
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

const LOGS_PAGE_SIZE = 200

function apiGet<T>(path: string): Promise<T> {
  const token = localStorage.getItem("todo_token")
  return fetch(`/api/admin${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(async (res) => {
    if (res.status === 401) {
      localStorage.removeItem("todo_token")
      window.dispatchEvent(new CustomEvent("auth:token-removed"))
    }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Request failed")
    return data as T
  })
}

function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem("todo_token")
  return fetch(`/api/admin${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (res.status === 401) {
      localStorage.removeItem("todo_token")
      window.dispatchEvent(new CustomEvent("auth:token-removed"))
    }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Request failed")
    return data as T
  })
}

function apiPut<T>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem("todo_token")
  return fetch(`/api/admin${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (res.status === 401) {
      localStorage.removeItem("todo_token")
      window.dispatchEvent(new CustomEvent("auth:token-removed"))
    }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Request failed")
    return data as T
  })
}

function apiDelete(path: string): Promise<void> {
  const token = localStorage.getItem("todo_token")
  return fetch(`/api/admin${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }).then(async (res) => {
    if (res.status === 401) {
      localStorage.removeItem("todo_token")
      window.dispatchEvent(new CustomEvent("auth:token-removed"))
    }
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Request failed")
    }
  })
}

export function AdminPanel({ onBack }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({})
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [emailDraft, setEmailDraft] = useState("")
  const [editingUsername, setEditingUsername] = useState<string | null>(null)
  const [usernameDraft, setUsernameDraft] = useState("")
  const [message, setMessage] = useState("")
  const [settings, setSettings] = useState<Settings>({ registrationEnabled: true, forgotPasswordEnabled: true, footerHtml: "" })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ username: "", email: "", password: "", role: "user" })
  const [view, setView] = useState<"users" | "audit">("users")
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsOffset, setLogsOffset] = useState(0)
  const [logsAction, setLogsAction] = useState("")

  const fetchUsers = useCallback(() => {
    setLoading(true)
    setMessage("")
    apiGet<User[]>("/users")
      .then(setUsers)
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false))
  }, [])

  const fetchSettings = useCallback(() => {
    apiGet<Settings>("/settings")
      .then(setSettings)
      .catch((e) => setMessage(e.message))
  }, [])

  const fetchLogs = useCallback(() => {
    setLogsLoading(true)
    const params = new URLSearchParams({ limit: String(LOGS_PAGE_SIZE), offset: String(logsOffset) })
    if (logsAction) params.set("action", logsAction)
    apiGet<AuditLog[]>(`/audit-logs?${params.toString()}`)
      .then(setLogs)
      .catch((e) => setMessage(e.message))
      .finally(() => setLogsLoading(false))
  }, [logsOffset, logsAction])

  useEffect(() => {
    fetchUsers()
    fetchSettings()
  }, [fetchUsers, fetchSettings])

  useEffect(() => {
    if (view === "audit") fetchLogs()
  }, [view, fetchLogs])

  const handleToggleSetting = async (key: string, value: boolean) => {
    try {
      const updated = await apiPut<Settings>("/settings", { [key]: value })
      setSettings(updated)
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  const handleSaveFooterHtml = async (html: string) => {
    try {
      const updated = await apiPut<Settings>("/settings", { footerHtml: html })
      setSettings(updated)
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  const handleToggleActive = async (id: string) => {
    try {
      const updated = await apiPut<User>(`/users/${id}/toggle-active`, {})
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此用户？")) return
    try {
      await apiDelete(`/users/${id}`)
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  const handleSetRole = async (id: string, role: string) => {
    try {
      const updated = await apiPut<User>(`/users/${id}/set-role`, { role })
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  const handleSaveEmail = async (id: string) => {
    if (!emailDraft) { setMessage("邮箱不能为空"); return }
    try {
      const updated = await apiPut<User>(`/users/${id}/email`, { email: emailDraft })
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
      setEditingEmail(null)
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  const handleSaveUsername = async (id: string) => {
    if (!usernameDraft || usernameDraft.length < 2 || usernameDraft.length > 20) {
      setMessage("用户名长度需在2-20个字符之间"); return
    }
    try {
      const updated = await apiPut<User>(`/users/${id}/username`, { username: usernameDraft })
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
      setEditingUsername(null)
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  const handleResetPassword = async (id: string) => {
    const pw = resetPasswords[id]
    if (!pw || pw.length < 6) { setMessage("密码至少6个字符"); return }
    try {
      await apiPut(`/users/${id}/reset-password`, { password: pw })
      setMessage("密码已重置")
      setResetPasswords((prev) => ({ ...prev, [id]: "" }))
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  const handleCreateUser = async () => {
    const { username, email, password, role } = createForm
    if (!username || !email || !password) { setMessage("请填写所有字段"); return }
    if (password.length < 6) { setMessage("密码至少6个字符"); return }
    try {
      await apiPost("/users", { username, email, password, role })
      setMessage("用户已创建")
      setShowCreateForm(false)
      setCreateForm({ username: "", email: "", password: "", role: "user" })
      fetchUsers()
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  return (
    <div className="mx-auto max-w-[52rem] px-4">
      {/* Header */}
      <header className="mb-6 flex items-baseline gap-3">
        <div>
          <h1 className="font-heading text-[2.5rem] font-medium italic leading-none tracking-[-0.03em] text-[var(--ink)]">
            管理员设置
          </h1>
          <div className="mt-1 text-[0.7rem] font-medium uppercase tracking-[0.06em] text-[var(--ink-dim)]">
            系统设置
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

      {/* Tabs */}
      <nav className="mb-6 flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow)]">
        <button
          onClick={() => setView("users")}
          className={`flex-1 cursor-pointer rounded-lg px-4 py-2 text-[0.8125rem] font-medium transition-all ${
            view === "users" ? "bg-[var(--accent-light)] text-[var(--accent)]" : "text-[var(--ink-dim)] hover:text-[var(--ink)]"
          }`}
        >
          系统设置
        </button>
        <button
          onClick={() => setView("audit")}
          className={`flex-1 cursor-pointer rounded-lg px-4 py-2 text-[0.8125rem] font-medium transition-all ${
            view === "audit" ? "bg-[var(--accent-light)] text-[var(--accent)]" : "text-[var(--ink-dim)] hover:text-[var(--ink)]"
          }`}
        >
          审计日志
        </button>
      </nav>

      {view === "users" && (
        <>
      {/* Settings section */}
      <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <h2 className="mb-4 font-[var(--font-heading)] text-[1rem] italic text-[var(--ink)]">功能开关</h2>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-between rounded-lg bg-[var(--border-light)] px-4 py-3 transition-all hover:bg-[var(--border)]">
            <div>
              <p className="text-[0.875rem] font-medium text-[var(--ink)]">注册新账号</p>
              <p className="text-[0.75rem] text-[var(--ink-muted)]">允许新用户通过注册页面创建账号</p>
            </div>
            <button
              onClick={() => handleToggleSetting("registrationEnabled", !settings.registrationEnabled)}
              className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                settings.registrationEnabled ? "bg-[var(--accent)]" : "bg-[var(--ink-muted)]"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  settings.registrationEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded-lg bg-[var(--border-light)] px-4 py-3 transition-all hover:bg-[var(--border)]">
            <div>
              <p className="text-[0.875rem] font-medium text-[var(--ink)]">找回密码</p>
              <p className="text-[0.75rem] text-[var(--ink-muted)]">允许用户通过邮箱找回密码（显示找回密码入口）</p>
            </div>
            <button
              onClick={() => handleToggleSetting("forgotPasswordEnabled", !settings.forgotPasswordEnabled)}
              className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                settings.forgotPasswordEnabled ? "bg-[var(--accent)]" : "bg-[var(--ink-muted)]"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  settings.forgotPasswordEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>
        </div>
      </section>

      {/* Footer setting section */}
      <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <h2 className="mb-4 font-[var(--font-heading)] text-[1rem] italic text-[var(--ink)]">页脚信息</h2>
        <textarea
          value={settings.footerHtml}
          onChange={(e) => setSettings((s) => ({ ...s, footerHtml: e.target.value }))}
          placeholder="请输入内容"
          onBlur={() => handleSaveFooterHtml(settings.footerHtml)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[0.8125rem] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          rows={3}
        />
      </section>

      {/* User management section */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[var(--font-heading)] text-[1rem] italic text-[var(--ink)]">用户管理</h2>
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="cursor-pointer rounded-lg bg-[var(--accent)] px-4 py-[0.5rem] text-[0.8125rem] font-semibold text-white transition-all hover:bg-[var(--accent-deep)]"
            >
              + 新建用户
            </button>
          ) : (
            <button
              onClick={() => { setShowCreateForm(false); setCreateForm({ username: "", email: "", password: "", role: "user" }) }}
              className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-[0.4rem] text-[0.75rem] text-[var(--ink-dim)] transition-all hover:text-[var(--ink)]"
            >
              取消
            </button>
          )}
        </div>

        {showCreateForm && (
          <div className="mb-4 flex items-center gap-1.5 rounded-lg bg-[var(--border-light)] p-2">
            <input
              value={createForm.username}
              onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="用户名"
              className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-[0.3rem] text-[0.75rem] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
            <input
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="邮箱"
              type="email"
              className="min-w-0 flex-[1.5] rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-[0.3rem] text-[0.75rem] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
            <input
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="密码"
              type="password"
              className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-[0.3rem] text-[0.75rem] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
              className="w-[6rem] cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-[0.3rem] text-[0.75rem] text-[var(--ink)] outline-none"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={handleCreateUser}
              className="shrink-0 cursor-pointer whitespace-nowrap rounded bg-[var(--accent)] px-3 py-[0.3rem] text-[0.75rem] font-semibold text-white transition-all hover:bg-[var(--accent-deep)]"
            >
              创建
            </button>
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-[0.8125rem] text-[var(--ink-muted)]">加载中...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.8125rem]">
              <thead>
                <tr className="text-[0.6875rem] uppercase tracking-[0.05em] text-[var(--ink-dim)]">
                  <th className="pb-2 pr-2 font-semibold">用户名</th>
                  <th className="pb-2 pr-2 font-semibold">邮箱</th>
                  <th className="pb-2 pr-2 font-semibold">角色</th>
                  <th className="pb-2 pr-2 font-semibold">状态</th>
                  <th className="pb-2 font-semibold">密码</th>
                  <th className="pb-2 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-[var(--border-light)]">
                    <td className="py-2 pr-2">
                      {editingUsername === u.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={usernameDraft}
                            onChange={(e) => setUsernameDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveUsername(u.id); if (e.key === "Escape") setEditingUsername(null) }}
                            onBlur={() => handleSaveUsername(u.id)}
                            autoFocus
                            className="w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-[2px] text-[0.75rem] text-[var(--ink)] outline-none"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingUsername(u.id); setUsernameDraft(u.username) }}
                          className="cursor-pointer border-b border-dotted border-[var(--ink-muted)] text-[var(--ink)] hover:text-[var(--accent)]"
                        >
                          {u.username}
                        </button>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {editingEmail === u.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={emailDraft}
                            onChange={(e) => setEmailDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveEmail(u.id); if (e.key === "Escape") setEditingEmail(null) }}
                            onBlur={() => handleSaveEmail(u.id)}
                            autoFocus
                            className="w-32 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-[2px] text-[0.75rem] text-[var(--ink)] outline-none"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingEmail(u.id); setEmailDraft(u.email) }}
                          className="cursor-pointer border-b border-dotted border-[var(--ink-muted)] text-[var(--ink-dim)] hover:text-[var(--ink)]"
                        >
                          {u.email}
                        </button>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={u.role}
                        onChange={(e) => handleSetRole(u.id, e.target.value)}
                        className={`cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-[2px] text-[0.75rem] text-[var(--ink)] outline-none ${
                          u.role === "admin" ? "border-[var(--accent)]" : ""
                        }`}
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <button
                        onClick={() => handleToggleActive(u.id)}
                        className={`relative inline-block h-5 w-9 cursor-pointer rounded-full transition-colors ${
                          u.isActive ? "bg-green-500" : "bg-[var(--ink-muted)]"
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            u.isActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-1">
                        <input
                          value={resetPasswords[u.id] || ""}
                          onChange={(e) => setResetPasswords((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          placeholder="新密码"
                          type="password"
                          className="w-20 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-[2px] text-[0.6875rem] text-[var(--ink)] outline-none"
                        />
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          className="cursor-pointer rounded px-2 py-[1px] text-[0.6875rem] text-[var(--accent)] hover:bg-[var(--border-light)]"
                        >
                          重置
                        </button>
                      </div>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="cursor-pointer rounded px-2 py-[1px] text-[0.6875rem] text-red-500 hover:bg-red-50"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
        </>
      )}

      {view === "audit" && (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[var(--font-heading)] text-[1rem] italic text-[var(--ink)]">审计日志</h2>
            <button
              onClick={fetchLogs}
              className="cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[0.75rem] text-[var(--ink-muted)] transition-all hover:border-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              刷新
            </button>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              value={logsAction}
              onChange={(e) => { setLogsAction(e.target.value); setLogsOffset(0) }}
              className="cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[0.75rem] text-[var(--ink)] outline-none"
            >
              <option value="">全部操作</option>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          {logsLoading ? (
            <p className="py-8 text-center text-[0.75rem] text-[var(--ink-muted)]">加载中…</p>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-[0.75rem] text-[var(--ink-muted)]">暂无审计日志</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[0.75rem]">
                <thead>
                  <tr className="border-b border-[var(--border-light)] text-[0.6875rem] text-[var(--ink-muted)]">
                    <th className="py-2 pr-3 font-medium">时间</th>
                    <th className="py-2 pr-3 font-medium">用户</th>
                    <th className="py-2 pr-3 font-medium">操作</th>
                    <th className="py-2 pr-3 font-medium">详情</th>
                    <th className="py-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-[var(--border-light)] last:border-0">
                      <td className="whitespace-nowrap py-2 pr-3 text-[var(--ink-muted)]">{formatTime(log.created)}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-[var(--ink)]">{log.username}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-[var(--ink)]">{ACTION_LABELS[log.action] || log.action}</td>
                      <td className="max-w-[20rem] break-words py-2 pr-3 text-[var(--ink-dim)]">{log.details || ""}</td>
                      <td className="whitespace-nowrap py-2 text-[var(--ink-muted)]">{log.ip || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setLogsOffset((o) => Math.max(0, o - LOGS_PAGE_SIZE))}
              disabled={logsOffset === 0}
              className="cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[0.75rem] text-[var(--ink-muted)] transition-all hover:border-[var(--ink-muted)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← 上一页
            </button>
            <span className="text-[0.7rem] text-[var(--ink-muted)]">
              第 {Math.floor(logsOffset / LOGS_PAGE_SIZE) + 1} 页
            </span>
            <button
              onClick={() => setLogsOffset((o) => o + LOGS_PAGE_SIZE)}
              disabled={logs.length < LOGS_PAGE_SIZE}
              className="cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[0.75rem] text-[var(--ink-muted)] transition-all hover:border-[var(--ink-muted)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页 →
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
