import { Router, Request, Response } from "express"
import {
  createUser, verifyUserPassword, getUserById, setResetToken,
  getUserByResetToken, resetUserPassword, getUserByEmail, getSettings,
  updateUser, changeUserPassword,
} from "./db"
import { generateToken, authMiddleware } from "./auth"
import { audit } from "./audit"

const router = Router()

router.post("/register", (req: Request, res: Response) => {
  const settings = getSettings()
  if (!settings.registrationEnabled) {
    return res.status(403).json({ error: "注册功能已关闭" })
  }
  const { username, email, password } = req.body
  if (!username || !email || !password) {
    return res.status(400).json({ error: "请填写所有字段" })
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: "用户名长度需在2-20个字符之间" })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "密码至少6个字符" })
  }
  try {
    const user = createUser(username, email, password)
    const token = generateToken({ id: user.id, username: user.username, role: user.role, tokenVersion: user.tokenVersion })
    audit(req, "auth.register", `注册账号：${username}`, { id: user.id, username: user.username })
    res.status(201).json({ user, token })
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "用户名或邮箱已存在" })
    }
    throw err
  }
})

router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: "请输入用户名和密码" })
  }
  const user = verifyUserPassword(username, password)
  if (!user) {
    audit(req, "auth.login_failed", `登录失败：${username}`)
    return res.status(401).json({ error: "用户名或密码错误，或账号已禁用" })
  }
  const token = generateToken({ id: user.id, username: user.username, role: user.role, tokenVersion: user.tokenVersion })
  audit(req, "auth.login", `登录成功：${user.username}`, { id: user.id, username: user.username })
  res.json({ user, token })
})

router.post("/forgot-password", (req: Request, res: Response) => {
  const settings = getSettings()
  if (!settings.forgotPasswordEnabled) {
    return res.status(403).json({ error: "找回密码功能已关闭" })
  }
  const { email } = req.body
  if (!email) return res.status(400).json({ error: "请输入邮箱" })
  const token = setResetToken(email)
  if (!token) {
    // Don't reveal whether the email exists
    return res.json({ ok: true })
  }
  audit(req, "auth.forgot_password", `申请找回密码：${email}`)
  res.json({ ok: true, resetToken: token })
})

router.post("/reset-password", (req: Request, res: Response) => {
  const { token, password } = req.body
  if (!token || !password) {
    return res.status(400).json({ error: "请填写重置令牌和密码" })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "密码至少6个字符" })
  }
  const user = resetUserPassword(token, password)
  if (!user) {
    return res.status(400).json({ error: "重置令牌无效或已过期" })
  }
  audit(req, "auth.reset_password", `通过重置令牌重置密码：${user.username}`, { id: user.id, username: user.username })
  res.json({ ok: true })
})

router.get("/me", authMiddleware, (req: Request, res: Response) => {
  const user = getUserById(req.user!.id)
  if (!user) return res.status(404).json({ error: "用户不存在" })
  res.json(user)
})

// ── Self-service account settings ──

router.put("/me/username", authMiddleware, (req: Request, res: Response) => {
  const { username } = req.body
  if (!username || username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: "用户名长度需在2-20个字符之间" })
  }
  try {
    const target = getUserById(req.user!.id)
    updateUser(req.user!.id, { username })
    const user = getUserById(req.user!.id)
    audit(req, "user.update_username", `修改用户名：${target?.username ?? req.user!.id} → ${username}`, { id: user!.id, username: user!.username })
    res.json(user)
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "该用户名已被使用" })
    }
    throw err
  }
})

router.put("/me/email", authMiddleware, (req: Request, res: Response) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: "请输入邮箱" })
  try {
    const target = getUserById(req.user!.id)
    updateUser(req.user!.id, { email })
    const user = getUserById(req.user!.id)
    audit(req, "user.update_email", `修改邮箱：${target?.email ?? target?.username ?? req.user!.id} → ${email}`, { id: user!.id, username: user!.username })
    res.json(user)
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "该邮箱已被使用" })
    }
    throw err
  }
})

router.put("/me/password", authMiddleware, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "请填写当前密码和新密码" })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "密码至少6个字符" })
  }
  const result = changeUserPassword(req.user!.id, currentPassword, newPassword)
  if (!result.ok) {
    if (result.reason === "wrong_password") return res.status(400).json({ error: "当前密码错误" })
    return res.status(404).json({ error: "用户不存在" })
  }
  audit(req, "user.update_password", `修改密码：${req.user!.username}`, { id: req.user!.id, username: req.user!.username })
  res.json({ ok: true })
})

router.get("/public-settings", (_req: Request, res: Response) => {
  const { registrationEnabled, forgotPasswordEnabled, footerHtml } = getSettings()
  res.json({ registrationEnabled, forgotPasswordEnabled, footerHtml })
})

export default router
