import { Router, Request, Response } from "express"
import {
  createUser, verifyUserPassword, getUserById, setResetToken,
  getUserByResetToken, resetUserPassword, getUserByEmail, getSettings,
} from "./db"
import { generateToken, authMiddleware } from "./auth"

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
    const token = generateToken({ id: user.id, username: user.username, role: user.role })
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
    return res.status(401).json({ error: "用户名或密码错误，或账号已禁用" })
  }
  const token = generateToken({ id: user.id, username: user.username, role: user.role })
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
  res.json({ ok: true })
})

router.get("/me", authMiddleware, (req: Request, res: Response) => {
  const user = getUserById(req.user!.id)
  if (!user) return res.status(404).json({ error: "用户不存在" })
  res.json(user)
})

router.get("/public-settings", (_req: Request, res: Response) => {
  const { registrationEnabled, forgotPasswordEnabled, footerHtml } = getSettings()
  res.json({ registrationEnabled, forgotPasswordEnabled, footerHtml })
})

export default router
