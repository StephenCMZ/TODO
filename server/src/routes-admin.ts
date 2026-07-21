import { Router, Request, Response } from "express"
import {
  listUsers, getUserById, deleteUser, toggleUserActive,
  setUserRole, updateUser, createUser, getSettings, updateSetting,
} from "./db"
import { authMiddleware, adminMiddleware } from "./auth"

const router = Router()

router.use(authMiddleware, adminMiddleware)

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
  deleteUser(req.params.id)
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
  res.json(user)
})

router.put("/users/:id/reset-password", (req: Request, res: Response) => {
  const { password } = req.body
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "密码至少6个字符" })
  }
  updateUser(req.params.id, { password })
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
  res.json(user)
})

router.put("/users/:id/email", (req: Request, res: Response) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: "请输入邮箱" })
  try {
    updateUser(req.params.id, { email })
    const user = getUserById(req.params.id)
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
    updateUser(req.params.id, { username })
    const user = getUserById(req.params.id)
    res.json(user)
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "该用户名已被使用" })
    }
    throw err
  }
})

export default router
