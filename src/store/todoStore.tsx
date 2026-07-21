import { createContext, useContext, useReducer, useState, useEffect, useCallback, type ReactNode } from "react"
import type { AppData, Project, ProjectSettings, Todo } from "../types"
import { genId } from "../utils/helpers"

// ── API helpers ──

const BASE = "/api"

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("todo_token")
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

async function handleResponse(res: Response): Promise<void> {
  if (res.status === 401) {
    localStorage.removeItem("todo_token")
    window.dispatchEvent(new CustomEvent("auth:token-removed"))
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, { headers: { ...authHeaders() } })
  await handleResponse(res)
  return res.json()
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  })
  await handleResponse(res)
  return res.json()
}

async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  })
  await handleResponse(res)
  return res.json()
}

async function apiDel(path: string): Promise<void> {
  const res = await fetch(BASE + path, { method: "DELETE", headers: { ...authHeaders() } })
  await handleResponse(res)
}

// ── helpers ──

function hasStatusNodes(projectId: string, state: AppData) {
  const p = state.projects.find((pr) => pr.id === projectId)
  return p && p.statuses && p.statuses.length > 0
}

export function isTodoDone(t: Todo, projectId: string, state: AppData) {
  if (hasStatusNodes(projectId, state)) {
    const p = state.projects.find((pr) => pr.id === projectId)
    return p ? t.statusIndex >= p.statuses.length - 1 : false
  }
  return t.statusIndex < 0
}

function defaultData(): AppData {
  return { projects: [], todos: [], defaultProjectId: "" }
}

/* ── actions ── */

type Action =
  | { type: "SET_DATA"; data: AppData }
  | { type: "ADD_PROJECT"; payload: { id: string; name: string; color: string; statuses: string[]; userId: string; ownerName: string; myRole: "manage" } }
  | { type: "UPDATE_PROJECT"; id: string; name: string; color: string; statuses: string[]; settings: ProjectSettings }
  | { type: "DELETE_PROJECT"; id: string }
  | { type: "ADD_TODO"; todo: Todo }
  | { type: "DELETE_TODO"; id: string }
  | { type: "RENAME_TODO"; id: string; text: string }
  | { type: "SET_TODO_STATUS"; id: string; statusIndex: number }
  | { type: "REORDER_TODO"; id: string; sortOrder: number }
  | { type: "CLEAR_DONE"; projectId: string }

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case "SET_DATA":
      return action.data

    case "ADD_PROJECT": {
      const { id, name, color, statuses, userId, ownerName, myRole } = action.payload
      const p: Project = {
        id,
        userId,
        ownerName,
        name: name.trim(),
        color,
        statuses,
        myRole,
        created: Date.now(),
        showDone: true,
        showTime: true,
        showFilterBar: true,
        autoSortDone: true,
        showIndex: true,
      }
      return { ...state, projects: [...state.projects, p] }
    }

    case "UPDATE_PROJECT": {
      const p = state.projects.find((pr) => pr.id === action.id)
      if (!p) return state
      const hadNodes = p.statuses.length > 0
      const hasNodes = action.statuses.length > 0
      const updated: Project = {
        ...p,
        name: action.name.trim(),
        color: action.color,
        statuses: action.statuses,
        ...action.settings,
      }
      let todos = state.todos
      if (hadNodes !== hasNodes || action.statuses.length !== p.statuses.length) {
        todos = state.todos.map((t) => {
          if (t.projectId !== action.id) return t
          if (!hasNodes) return { ...t, statusIndex: 0 }
          if (t.statusIndex >= updated.statuses.length) {
            return { ...t, statusIndex: Math.max(0, updated.statuses.length - 1) }
          }
          return t
        })
      }
      return {
        ...state,
        projects: state.projects.map((pr) => (pr.id === action.id ? updated : pr)),
        todos,
      }
    }

    case "DELETE_PROJECT":
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        todos: state.todos.filter((t) => t.projectId !== action.id),
      }

    case "ADD_TODO":
      return { ...state, todos: [...state.todos, action.todo] }

    case "DELETE_TODO":
      return { ...state, todos: state.todos.filter((t) => t.id !== action.id) }

    case "RENAME_TODO":
      return {
        ...state,
        todos: state.todos.map((t) => (t.id === action.id ? { ...t, text: action.text.trim() } : t)),
      }

    case "SET_TODO_STATUS":
      return {
        ...state,
        todos: state.todos.map((t) => (t.id === action.id ? { ...t, statusIndex: action.statusIndex } : t)),
      }

    case "REORDER_TODO":
      return {
        ...state,
        todos: state.todos.map((t) => (t.id === action.id ? { ...t, sortOrder: action.sortOrder } : t)),
      }

    case "CLEAR_DONE": {
      const project = state.projects.find((p) => p.id === action.projectId)
      if (!project) return state
      if (project.statuses.length > 0) {
        const lastIdx = project.statuses.length - 1
        return {
          ...state,
          todos: state.todos.filter((t) => t.projectId !== action.projectId || t.statusIndex < lastIdx),
        }
      }
      return {
        ...state,
        todos: state.todos.filter((t) => t.projectId !== action.projectId || t.statusIndex >= 0),
      }
    }

    default:
      return state
  }
}

/* ── context ── */

interface StoreContextValue {
  state: AppData
  loading: boolean
  reload: () => Promise<void>
  addProject: (name: string, color: string, statuses: string[]) => Promise<string>
  updateProject: (id: string, name: string, color: string, statuses: string[], settings: ProjectSettings) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  addTodo: (projectId: string, text: string) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  renameTodo: (id: string, text: string) => Promise<void>
  setTodoStatus: (id: string, statusIndex: number) => Promise<void>
  reorderTodo: (id: string, sortOrder: number) => Promise<void>
  toggleTodoDone: (id: string) => Promise<void>
  clearDone: (projectId: string) => Promise<void>
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultData())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const projects = await apiGet<Project[]>("/projects")
      const todosResults = await Promise.all(
        projects.map((p) => apiGet<Todo[]>(`/projects/${p.id}/todos`))
      )
      dispatch({
        type: "SET_DATA",
        data: { projects, todos: todosResults.flat(), defaultProjectId: "" },
      })
    } catch (err) {
      console.error("Failed to load data:", err)
    } finally {
      setLoading(false)
    }
  }

  const addProject = useCallback(async (name: string, color: string, statuses: string[]) => {
    const id = genId()
    const project = await apiPost<Project>("/projects", { id, name, color, statuses })
    dispatch({
      type: "ADD_PROJECT",
      payload: {
        id,
        name,
        color,
        statuses,
        userId: project.userId || "",
        ownerName: project.ownerName || "",
        myRole: "manage",
      },
    })
    return id
  }, [])

  const updateProject = useCallback(
    async (id: string, name: string, color: string, statuses: string[], settings: ProjectSettings) => {
      await apiPut(`/projects/${id}`, {
        name,
        color,
        statuses,
        showDone: settings.showDone,
        showTime: settings.showTime,
        showFilterBar: settings.showFilterBar,
        autoSortDone: settings.autoSortDone,
        showIndex: settings.showIndex,
      })
      dispatch({ type: "UPDATE_PROJECT", id, name, color, statuses, settings })
    },
    [],
  )

  const deleteProject = useCallback(async (id: string) => {
    await apiDel(`/projects/${id}`)
    dispatch({ type: "DELETE_PROJECT", id })
  }, [])

  const addTodo = useCallback(async (projectId: string, text: string) => {
    const id = genId()
    const todo = await apiPost<Todo>("/todos", { id, projectId, text: text.trim() })
    dispatch({ type: "ADD_TODO", todo })
  }, [])

  const deleteTodo = useCallback(async (id: string) => {
    await apiDel(`/todos/${id}`)
    dispatch({ type: "DELETE_TODO", id })
  }, [])

  const renameTodo = useCallback(async (id: string, text: string) => {
    await apiPut(`/todos/${id}`, { text: text.trim() })
    dispatch({ type: "RENAME_TODO", id, text })
  }, [])

  const setTodoStatus = useCallback(async (id: string, statusIndex: number) => {
    await apiPut(`/todos/${id}/status`, { statusIndex })
    dispatch({ type: "SET_TODO_STATUS", id, statusIndex })
  }, [])

  const reorderTodo = useCallback(async (id: string, sortOrder: number) => {
    await apiPut(`/todos/${id}/reorder`, { sortOrder })
    dispatch({ type: "REORDER_TODO", id, sortOrder })
  }, [])

  const toggleTodoDone = useCallback(async (id: string) => {
    const todo = await apiPut<Todo>(`/todos/${id}/toggle`, {})
    dispatch({ type: "SET_TODO_STATUS", id, statusIndex: todo.statusIndex })
  }, [])

  const clearDone = useCallback(async (projectId: string) => {
    await apiPost("/todos/clear-done", { projectId })
    dispatch({ type: "CLEAR_DONE", projectId })
  }, [])

  return (
    <StoreContext.Provider
      value={{
        state,
        loading,
        reload: loadAll,
        addProject,
        updateProject,
        deleteProject,
        addTodo,
        deleteTodo,
        renameTodo,
        setTodoStatus,
        reorderTodo,
        toggleTodoDone,
        clearDone,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}
