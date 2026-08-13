import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import type { Request, Response, NextFunction } from "express"
import { getUserById, getProject, getUserProjectRole, getTodoProjectId } from "./db"

const JWT_SECRET = process.env.JWT_SECRET || "todo-app-jwt-secret-dev-only"

export interface UserPayload {
  id: string
  username: string
  role: string
  tokenVersion?: number
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload
    }
  }
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash)
}

export function generateToken(user: UserPayload): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload
  } catch {
    return null
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" })
    return
  }
  const token = header.slice(7)
  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" })
    return
  }
  // Verify account is still active and use live role from DB
  const user = getUserById(payload.id)
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Account disabled" })
    return
  }
  // Reject tokens issued before the latest password change (forces re-login)
  if ((payload.tokenVersion ?? 0) !== user.tokenVersion) {
    res.status(401).json({ error: "登录已失效，请重新登录" })
    return
  }
  req.user = { ...payload, role: user.role }
  next()
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" })
    return
  }
  next()
}

export function projectManageMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin" && req.user?.role !== "project_admin") {
    res.status(403).json({ error: "Project management access required" })
    return
  }
  next()
}

/**
 * Resolve project ID from request: checks params, body, or looks up todo by ID.
 */
function resolveProjectId(req: Request): string | null {
  // Direct project ID in params (e.g. /projects/:id, /projects/:id/todos)
  if (req.params.id) {
    const project = getProject(req.params.id)
    if (project) return project.id
    // Treat as todo ID and look up its project
    const todoProjectId = getTodoProjectId(req.params.id)
    if (todoProjectId) return todoProjectId
  }
  // Project ID in body (e.g. POST /todos, POST /todos/clear-done)
  if (req.body.projectId) return req.body.projectId
  return null
}

/**
 * Require minimum project-level role: "view", "edit", or "manage".
 * System admin always passes through. project_admin and user are
 * determined by project ownership and membership role.
 */
export function requireProjectRole(minRole: "view" | "edit" | "manage") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === "admin") return next()

    const projectId = resolveProjectId(req)
    if (!projectId) {
      res.status(400).json({ error: "缺少项目ID" })
      return
    }

    const project = getProject(projectId)
    if (!project) {
      res.status(404).json({ error: "项目不存在" })
      return
    }

    // Project owner has manage rights
    if (project.userId === req.user!.id) return next()

    const role = getUserProjectRole(req.user!.id, projectId)
    if (!role) {
      res.status(403).json({ error: "没有项目的访问权限" })
      return
    }

    const hierarchy: Record<string, number> = { view: 0, edit: 1, manage: 2 }
    if (hierarchy[role] < hierarchy[minRole]) {
      res.status(403).json({ error: "权限不足" })
      return
    }

    next()
  }
}
