import { Router, Request, Response } from "express"
import {
  listProjects, getProject, createProject, updateProject, deleteProject,
  listTodos, createTodo, getTodo, deleteTodoById, updateTodoText,
  setTodoStatus, updateTodoStatuses, reorderTodo, toggleTodoDone, clearDoneTodos,
  getProjectMembers, addProjectMember, removeProjectMember, updateProjectMemberRole,
  listUsers,
} from "./db"
import { authMiddleware, projectManageMiddleware, requireProjectRole } from "./auth"

const router = Router()

// ── Projects ──

router.get("/projects", authMiddleware, (req: Request, res: Response) => {
  const projects = req.user!.role === "admin"
    ? listProjects()
    : listProjects(req.user!.id, req.user!.role)
  res.json(projects)
})

router.get("/projects/:id", authMiddleware, requireProjectRole("view"), (req: Request, res: Response) => {
  const project = getProject(req.params.id)
  if (!project) return res.status(404).json({ error: "项目不存在" })
  res.json(project)
})

router.post("/projects", authMiddleware, projectManageMiddleware, (req: Request, res: Response) => {
  const { id, name, color, statuses } = req.body
  if (!id || !name) return res.status(400).json({ error: "请填写所有字段" })
  const project = createProject(id, name, color || "#c7433a", statuses || [], req.user!.id)
  res.status(201).json(project)
})

router.put("/projects/:id", authMiddleware, requireProjectRole("manage"), (req: Request, res: Response) => {
  const { name, color, statuses, ownerId, ...settings } = req.body
  if (!name) return res.status(400).json({ error: "请填写所有字段" })
  updateProject(req.params.id, name, color, statuses || [], settings, ownerId)
  const project = getProject(req.params.id)
  res.json(project)
})

router.delete("/projects/:id", authMiddleware, requireProjectRole("manage"), (req: Request, res: Response) => {
  deleteProject(req.params.id)
  res.status(204).send()
})

// ── Todos ──

router.get("/projects/:id/todos", authMiddleware, requireProjectRole("view"), (req: Request, res: Response) => {
  const todos = listTodos(req.params.id)
  res.json(todos)
})

router.post("/todos", authMiddleware, requireProjectRole("edit"), (req: Request, res: Response) => {
  const { id, projectId, text } = req.body
  if (!id || !projectId || !text) return res.status(400).json({ error: "请填写所有字段" })
  const todo = createTodo(id, projectId, text)
  res.status(201).json(todo)
})

router.put("/todos/:id", authMiddleware, requireProjectRole("edit"), (req: Request, res: Response) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: "请输入任务内容" })
  updateTodoText(req.params.id, text)
  const todo = getTodo(req.params.id)
  res.json(todo)
})

router.delete("/todos/:id", authMiddleware, requireProjectRole("edit"), (req: Request, res: Response) => {
  deleteTodoById(req.params.id)
  res.status(204).send()
})

router.put("/todos/:id/status", authMiddleware, requireProjectRole("edit"), (req: Request, res: Response) => {
  const { statusIndex } = req.body
  if (statusIndex === undefined) return res.status(400).json({ error: "缺少状态索引" })
  setTodoStatus(req.params.id, statusIndex)
  const todo = getTodo(req.params.id)
  res.json(todo)
})

router.put("/todos/:id/statuses", authMiddleware, requireProjectRole("edit"), (req: Request, res: Response) => {
  const { statuses } = req.body
  updateTodoStatuses(req.params.id, statuses === undefined ? null : statuses)
  const todo = getTodo(req.params.id)
  res.json(todo)
})

router.put("/todos/:id/reorder", authMiddleware, requireProjectRole("edit"), (req: Request, res: Response) => {
  const { sortOrder } = req.body
  if (sortOrder === undefined) return res.status(400).json({ error: "缺少排序序号" })
  reorderTodo(req.params.id, sortOrder)
  res.json({ ok: true })
})

router.put("/todos/:id/toggle", authMiddleware, requireProjectRole("edit"), (req: Request, res: Response) => {
  toggleTodoDone(req.params.id)
  const todo = getTodo(req.params.id)
  res.json(todo)
})

router.post("/todos/clear-done", authMiddleware, requireProjectRole("edit"), (req: Request, res: Response) => {
  const { projectId } = req.body
  if (!projectId) return res.status(400).json({ error: "缺少项目ID" })
  clearDoneTodos(projectId)
  res.json({ ok: true })
})

// ── Users (for member picker) ──

router.get("/users", authMiddleware, (req: Request, res: Response) => {
  const users = listUsers()
  res.json(users.map((u) => ({ id: u.id, username: u.username })))
})

// ── Project Members ──

router.get("/projects/:id/members", authMiddleware, requireProjectRole("manage"), (req: Request, res: Response) => {
  const members = getProjectMembers(req.params.id)
  res.json(members)
})

router.post("/projects/:id/members", authMiddleware, requireProjectRole("manage"), (req: Request, res: Response) => {
  const { userId, role } = req.body
  if (!userId || !role) return res.status(400).json({ error: "请填写所有字段" })
  if (!["manage", "edit", "view"].includes(role)) return res.status(400).json({ error: "角色无效" })
  addProjectMember(req.params.id, userId, role)
  res.status(201).json({ ok: true })
})

router.put("/projects/:id/members/:userId", authMiddleware, requireProjectRole("manage"), (req: Request, res: Response) => {
  if (req.params.userId === req.user!.id && req.user?.role !== "admin") return res.status(400).json({ error: "不能修改自己的角色" })
  const { role } = req.body
  if (!role || !["manage", "edit", "view"].includes(role)) return res.status(400).json({ error: "角色无效" })
  updateProjectMemberRole(req.params.id, req.params.userId, role)
  res.json({ ok: true })
})

router.delete("/projects/:id/members/:userId", authMiddleware, requireProjectRole("manage"), (req: Request, res: Response) => {
  if (req.params.userId === req.user!.id && req.user?.role !== "admin") return res.status(400).json({ error: "不能移除自己" })
  removeProjectMember(req.params.id, req.params.userId)
  res.status(204).send()
})

export default router
