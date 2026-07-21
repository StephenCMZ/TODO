import Database from "better-sqlite3"
import path from "path"
import fs from "fs"
import crypto from "crypto"
import { hashPassword, comparePassword } from "./auth"
import { isEncryptionEnabled, encrypt, decrypt } from "./encryption"

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "todo.db")

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    db = new Database(DB_PATH)

    // Enable WAL mode for better performance
    db.pragma("journal_mode = WAL")

    createSchema()
    migrateProjects()
  }
  return db
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      reset_token TEXT,
      reset_token_expires INTEGER,
      created INTEGER NOT NULL,
      updated INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#c7433a',
      statuses TEXT NOT NULL DEFAULT '[]',
      created INTEGER NOT NULL,
      show_done INTEGER NOT NULL DEFAULT 1,
      show_time INTEGER NOT NULL DEFAULT 1,
      show_filter_bar INTEGER NOT NULL DEFAULT 1,
      auto_sort_done INTEGER NOT NULL DEFAULT 1,
      show_index INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      text TEXT NOT NULL,
      status_index INTEGER NOT NULL DEFAULT 0,
      created INTEGER NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(project_id);
    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'edit',
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)
  // Default settings
  const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)")
  insertSetting.run("registration_enabled", "true")
  insertSetting.run("forgot_password_enabled", "true")
  insertSetting.run("footer_html", "")
}

function migrateProjects() {
  // Add user_id column if it doesn't exist (for databases created before auth)
  const columns = db.prepare("PRAGMA table_info(projects)").all() as any[]
  if (!columns.some((c: any) => c.name === "user_id")) {
    db.exec("ALTER TABLE projects ADD COLUMN user_id TEXT")
    db.exec("CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)")
  }
}

export function closeDb() {
  if (db) db.close()
}

// ── User CRUD ──

function rowToUser(row: any) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    isActive: !!row.is_active,
    created: row.created,
    updated: row.updated,
  }
}

export function createUser(username: string, email: string, password: string, assignedRole?: string) {
  const id = crypto.randomUUID()
  const now = Date.now()
  const count = db.prepare("SELECT COUNT(*) as c FROM users").get() as any
  const role = assignedRole || (count.c === 0 ? "admin" : "user")
  const pwHash = hashPassword(password)
  db.prepare(
    "INSERT INTO users (id, username, email, password_hash, role, is_active, created, updated) VALUES (?, ?, ?, ?, ?, 1, ?, ?)"
  ).run(id, username, email, pwHash, role, now, now)

  // Assign orphaned projects to the first user
  if (count.c === 0) {
    db.prepare("UPDATE projects SET user_id = ? WHERE user_id IS NULL").run(id)
  }

  return rowToUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any)
}

export function getUserById(id: string) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any
  return row ? rowToUser(row) : null
}

export function getUserByUsername(username: string) {
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any
  return row ? { ...rowToUser(row), passwordHash: row.password_hash } : null
}

export function getUserByEmail(email: string) {
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any
  return row ? { ...rowToUser(row), passwordHash: row.password_hash } : null
}

export function getUserByResetToken(token: string) {
  const row = db.prepare(
    "SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?"
  ).get(token, Date.now()) as any
  return row ? rowToUser(row) : null
}

export function listUsers() {
  const rows = db.prepare("SELECT * FROM users ORDER BY created ASC").all() as any[]
  return rows.map(rowToUser)
}

export function updateUser(id: string, updates: Partial<{ username: string; email: string; role: string; isActive: boolean; password: string }>) {
  const sets: string[] = []
  const vals: any[] = []
  if (updates.username !== undefined) { sets.push("username = ?"); vals.push(updates.username) }
  if (updates.email !== undefined) { sets.push("email = ?"); vals.push(updates.email) }
  if (updates.role !== undefined) { sets.push("role = ?"); vals.push(updates.role) }
  if (updates.isActive !== undefined) { sets.push("is_active = ?"); vals.push(updates.isActive ? 1 : 0) }
  if (updates.password !== undefined) { sets.push("password_hash = ?"); vals.push(hashPassword(updates.password)) }
  if (sets.length === 0) return
  sets.push("updated = ?")
  vals.push(Date.now())
  vals.push(id)
  db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...vals)
}

export function deleteUser(id: string) {
  db.prepare("UPDATE projects SET user_id = NULL WHERE user_id = ?").run(id)
  db.prepare("DELETE FROM users WHERE id = ?").run(id)
}

export function setUserRole(id: string, role: string) {
  db.prepare("UPDATE users SET role = ?, updated = ? WHERE id = ?").run(role, Date.now(), id)
}

export function toggleUserActive(id: string) {
  const user = db.prepare("SELECT is_active FROM users WHERE id = ?").get(id) as any
  if (!user) return null
  const newActive = user.is_active ? 0 : 1
  db.prepare("UPDATE users SET is_active = ?, updated = ? WHERE id = ?").run(newActive, Date.now(), id)
  return getUserById(id)
}

export function verifyUserPassword(usernameOrEmail: string, password: string) {
  const byUsername = db.prepare("SELECT * FROM users WHERE username = ?").get(usernameOrEmail) as any
  const row = byUsername || db.prepare("SELECT * FROM users WHERE email = ?").get(usernameOrEmail) as any
  if (!row) return null
  if (!row.is_active) return null
  if (!comparePassword(password, row.password_hash)) return null
  return rowToUser(row)
}

export function setResetToken(email: string) {
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any
  if (!user) return null
  const token = crypto.randomBytes(32).toString("hex")
  const expires = Date.now() + 3600000 // 1 hour
  db.prepare("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?").run(token, expires, user.id)
  return token
}

export function resetUserPassword(token: string, password: string) {
  const user = db.prepare(
    "SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?"
  ).get(token, Date.now()) as any
  if (!user) return null
  const pwHash = hashPassword(password)
  db.prepare(
    "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated = ? WHERE id = ?"
  ).run(pwHash, Date.now(), user.id)
  return rowToUser(user)
}

// ── Project CRUD ──

export function listProjects(userId?: string, userRole?: string) {
  if (!userId) {
    const rows = db.prepare(`
      SELECT p.*, u.username as owner_name, 'manage' as my_role
      FROM projects p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created ASC
    `).all() as any[]
    return rows.map(rowToProject)
  }
  const rows = db.prepare(`
    SELECT DISTINCT p.*, u.username as owner_name,
      CASE
        WHEN p.user_id = ? THEN 'manage'
        ELSE COALESCE(pm.role, ?)
      END as my_role
    FROM projects p
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
    WHERE p.user_id = ? OR pm.user_id = ?
    ORDER BY p.created ASC
  `).all(userId, userRole === 'project_admin' ? 'manage' : 'view', userId, userId, userId) as any[]
  return rows.map(rowToProject)
}

export function getProject(id: string) {
  const row = db.prepare(`
    SELECT p.*, u.username as owner_name
    FROM projects p
    LEFT JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
  `).get(id) as any
  return row ? rowToProject(row) : null
}

export function createProject(id: string, name: string, color: string, statuses: string[], userId?: string) {
  const stmt = db.prepare(
    "INSERT INTO projects (id, user_id, name, color, statuses, created, show_done, show_time, show_filter_bar, auto_sort_done, show_index) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 1, 1, 1)"
  )
  stmt.run(id, userId || null, name.trim(), color, JSON.stringify(statuses), Date.now())
  return getProject(id)
}

export function updateProject(id: string, name: string, color: string, statuses: string[], settings: any, ownerId?: string) {
  if (ownerId !== undefined) {
    // Get current owner before changing
    const project = getProject(id)
    const oldOwnerId = project?.userId
    db.prepare("UPDATE projects SET user_id = ? WHERE id = ?").run(ownerId, id)
    // Remove new owner from members (they're identified by user_id on the project)
    removeProjectMember(id, ownerId)
    // Keep old owner as a manage member so they retain access
    if (oldOwnerId && oldOwnerId !== ownerId) {
      addProjectMember(id, oldOwnerId, "manage")
    }
  }
  const stmt = db.prepare(
    "UPDATE projects SET name = ?, color = ?, statuses = ?, show_done = ?, show_time = ?, show_filter_bar = ?, auto_sort_done = ?, show_index = ? WHERE id = ?"
  )
  stmt.run(
    name.trim(), color, JSON.stringify(statuses),
    settings.showDone ? 1 : 0,
    settings.showTime ? 1 : 0,
    settings.showFilterBar ? 1 : 0,
    settings.autoSortDone ? 1 : 0,
    settings.showIndex ? 1 : 0,
    id
  )

  // Adjust todo status indices if statuses changed
  const hadNodes = (statuses || []).length > 0
  const todos = listTodosRaw(id)
  for (const t of todos) {
    if (!hadNodes) {
      db.prepare("UPDATE todos SET status_index = 0 WHERE id = ?").run(t.id)
    } else if (t.status_index >= statuses.length) {
      db.prepare("UPDATE todos SET status_index = ? WHERE id = ?").run(Math.max(0, statuses.length - 1), t.id)
    }
  }
}

export function deleteProject(id: string) {
  db.prepare("DELETE FROM todos WHERE project_id = ?").run(id)
  db.prepare("DELETE FROM projects WHERE id = ?").run(id)
}

// ── Todo CRUD ──

function listTodosRaw(projectId: string) {
  return db.prepare("SELECT * FROM todos WHERE project_id = ? ORDER BY sort_order ASC").all(projectId) as any[]
}

export function listTodos(projectId: string) {
  const rows = listTodosRaw(projectId)
  return rows.map(rowToTodo)
}

export function createTodo(id: string, projectId: string, text: string) {
  const now = Date.now()
  const storedText = isEncryptionEnabled() ? encrypt(text) : text
  const stmt = db.prepare(
    "INSERT INTO todos (id, project_id, text, status_index, created, sort_order) VALUES (?, ?, ?, 0, ?, ?)"
  )
  stmt.run(id, projectId, storedText, now, now)
  return getTodo(id)
}

export function getTodo(id: string) {
  const row = db.prepare("SELECT * FROM todos WHERE id = ?").get(id) as any
  return row ? rowToTodo(row) : null
}

export function updateTodoText(id: string, text: string) {
  const storedText = isEncryptionEnabled() ? encrypt(text) : text
  db.prepare("UPDATE todos SET text = ? WHERE id = ?").run(storedText, id)
}

export function deleteTodoById(id: string) {
  db.prepare("DELETE FROM todos WHERE id = ?").run(id)
}

export function setTodoStatus(id: string, statusIndex: number) {
  db.prepare("UPDATE todos SET status_index = ? WHERE id = ?").run(statusIndex, id)
}

export function reorderTodo(id: string, sortOrder: number) {
  db.prepare("UPDATE todos SET sort_order = ? WHERE id = ?").run(sortOrder, id)
}

export function toggleTodoDone(id: string) {
  const todo = db.prepare("SELECT status_index FROM todos WHERE id = ?").get(id) as any
  if (!todo) return
  const newIndex = todo.status_index === 0 ? -1 : 0
  db.prepare("UPDATE todos SET status_index = ? WHERE id = ?").run(newIndex, id)
}

export function clearDoneTodos(projectId: string) {
  const project = getProject(projectId)
  if (!project) return
  if (project.statuses.length > 0) {
    const lastIdx = project.statuses.length - 1
    db.prepare("DELETE FROM todos WHERE project_id = ? AND status_index >= ?").run(projectId, lastIdx)
  } else {
    db.prepare("DELETE FROM todos WHERE project_id = ? AND status_index < 0").run(projectId)
  }
}

// ── Project Members ──

function rowToProjectMember(row: any) {
  return {
    userId: row.user_id,
    username: row.username,
    email: row.email,
    role: row.role,
  }
}

export function getProjectMembers(projectId: string) {
  const rows = db.prepare(`
    SELECT pm.user_id, u.username, u.email, pm.role
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY u.username ASC
  `).all(projectId) as any[]
  return rows.map(rowToProjectMember)
}

export function addProjectMember(projectId: string, userId: string, role: string) {
  db.prepare("INSERT OR REPLACE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)").run(projectId, userId, role)
}

export function removeProjectMember(projectId: string, userId: string) {
  db.prepare("DELETE FROM project_members WHERE project_id = ? AND user_id = ?").run(projectId, userId)
}

export function updateProjectMemberRole(projectId: string, userId: string, role: string) {
  db.prepare("UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?").run(role, projectId, userId)
}

export function getUserProjectRole(userId: string, projectId: string): string | null {
  const row = db.prepare("SELECT role FROM project_members WHERE project_id = ? AND user_id = ?").get(projectId, userId) as any
  return row ? row.role : null
}

export function getTodoProjectId(todoId: string): string | null {
  const row = db.prepare("SELECT project_id FROM todos WHERE id = ?").get(todoId) as any
  return row ? row.project_id : null
}

// ── Settings ──

export function getSettings() {
  const rows = db.prepare("SELECT * FROM settings").all() as any[]
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value
  return {
    registrationEnabled: map.registration_enabled !== "false",
    forgotPasswordEnabled: map.forgot_password_enabled !== "false",
    footerHtml: map.footer_html || "",
  }
}

export function updateSetting(key: string, value: string) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value)
}

// ── Mapping helpers ──

function rowToProject(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    ownerName: row.owner_name || undefined,
    name: row.name,
    color: row.color,
    statuses: JSON.parse(row.statuses || "[]"),
    created: row.created,
    showDone: !!row.show_done,
    showTime: !!row.show_time,
    showFilterBar: !!row.show_filter_bar,
    autoSortDone: !!row.auto_sort_done,
    showIndex: !!row.show_index,
    myRole: row.my_role || undefined,
  }
}

function rowToTodo(row: any) {
  const decrypted = isEncryptionEnabled() ? decrypt(row.text) : row.text
  return {
    id: row.id,
    projectId: row.project_id,
    text: decrypted,
    statusIndex: row.status_index,
    created: row.created,
    sortOrder: row.sort_order,
  }
}
