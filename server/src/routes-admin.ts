import { Router, Request, Response } from "express"
import {
  listUsers, getUserById, deleteUser, toggleUserActive,
  setUserRole, updateUser, createUser, getSettings, updateSetting, bumpTokenVersion,
} from "./db"
import { authMiddleware, adminMiddleware } from "./auth"
import { audit, listAuditLogs } from "./audit"

const router = Router()

router.use(authMiddleware, adminMiddleware)

router.get("/audit-logs", (req: Request, res: Response) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? ""), 10) || 200, 1), 1000)
  const offset = Math.max(parseInt(String(req.query.offset ?? ""), 10) || 0, 0)
  const action = typeof req.query.action === "string" && req.query.action ? req.query.action : undefined
  res.json(listAuditLogs(limit, offset, action))
})

router.get("/settings", (_req: Request, res: Response) => {
  const settings = getSettings()
  res.json(settings)
})

router.put("/settings", (req: Request, res: Response) => {
  const { registrationEnabled, forgotPasswordEnabled, footerHtml } = req.body
  if (registrationEnabled !== undefined) {
    updateSetting("registration_enabled", registrationEnabled ? "true" : "false")
  }
  if (forgotPasswordEnabled !== undefined) {
    updateSetting("forgot_password_enabled", forgotPasswordEnabled ? "true" : "false")
  }
  if (footerHtml !== undefined) {
    updateSetting("footer_html", footerHtml)
  }
  const changes = ["registrationEnabled", "forgotPasswordEnabled", "footerHtml"]
    .filter((k) => req.body[k] !== undefined)
    .join(", ")
  audit(req, "admin.settings", `更新设置：${changes || "无"}`)
  res.json(getSettings())
})

router.get("/users", (_req: Request, res: Response) => {
  const users = listUsers()
  res.json(users)
})

router.delete("/users/:id", (req: Request, res: Response) => {
  if (req.params.id === req.user!.id) {
    return res.status(400).json({ error: "无法删除自己的账户" })
  }
  const target = getUserById(req.params.id)
  deleteUser(req.params.id)
  audit(req, "admin.user.delete", `删除用户：${target?.username ?? req.params.id}`)
  res.status(204).send()
})

router.post("/users", (req: Request, res: Response) => {
  const { username, email, password, role } = req.body
  if (!username || !email || !password) {
    return res.status(400).json({ error: "请填写所有字段" })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "密码至少6个字符" })
  }
  try {
    const user = createUser(username, email, password, role || "user")
    audit(req, "admin.user.create", `创建用户：${user.username}（${user.role}）`)
    res.status(201).json(user)
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "用户名或邮箱已被使用" })
    }
    throw err
  }
})

router.put("/users/:id/toggle-active", (req: Request, res: Response) => {
  if (req.params.id === req.user!.id) {
    return res.status(400).json({ error: "无法禁用自己" })
  }
  const user = toggleUserActive(req.params.id)
  if (!user) return res.status(404).json({ error: "用户不存在" })
  audit(req, "admin.user.toggle_active", `${user.isActive ? "启用" : "禁用"}用户：${user.username}`)
  res.json(user)
})

router.put("/users/:id/reset-password", (req: Request, res: Response) => {
  const { password } = req.body
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "密码至少6个字符" })
  }
  const target = getUserById(req.params.id)
  updateUser(req.params.id, { password })
  bumpTokenVersion(req.params.id)
  audit(req, "admin.user.reset_password", `重置密码：${target?.username ?? req.params.id}`)
  res.json({ ok: true })
})

router.put("/users/:id/set-role", (req: Request, res: Response) => {
  const { role } = req.body
  if (!["admin", "project_admin", "user"].includes(role)) {
    return res.status(400).json({ error: "角色必须为 admin、project_admin 或 user" })
  }
  if (req.params.id === req.user!.id && role !== "admin") {
    return res.status(400).json({ error: "无法移除自己的管理员角色" })
  }
  setUserRole(req.params.id, role)
  const user = getUserById(req.params.id)
  audit(req, "admin.user.set_role", `修改角色：${user?.username ?? req.params.id} → ${role}`)
  res.json(user)
})

router.put("/users/:id/email", (req: Request, res: Response) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: "请输入邮箱" })
  try {
    const target = getUserById(req.params.id)
    updateUser(req.params.id, { email })
    const user = getUserById(req.params.id)
    audit(req, "admin.user.update_email", `修改邮箱：${target?.email ?? target?.username ?? req.params.id} → ${email}`)
    res.json(user)
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "该邮箱已被使用" })
    }
    throw err
  }
})

router.put("/users/:id/username", (req: Request, res: Response) => {
  const { username } = req.body
  if (!username || username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: "用户名长度需在2-20个字符之间" })
  }
  try {
    const target = getUserById(req.params.id)
    updateUser(req.params.id, { username })
    const user = getUserById(req.params.id)
    audit(req, "admin.user.update_username", `修改用户名：${target?.username ?? req.params.id} → ${username}`)
    res.json(user)
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "该用户名已被使用" })
    }
    throw err
  }
})

export default router
