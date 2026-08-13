import { useRef } from "react"
import type { Project, Todo } from "../types"
import { useStore } from "../store/todoStore"
import { TodoItem } from "./TodoItem"

interface Props {
  project: Project
  todos: Todo[]
  editingId: string | null
  onStartEdit: (id: string) => void
  onSaveEdit: (id: string, text: string) => void
  onCancelEdit: () => void
  onDelete: (id: string) => void
  onToggleDone: (id: string) => void
  onStatusClick: (id: string, idx: number) => void
  onReorder: (id: string, sortOrder: number) => void
  onAdd: (text: string, parentId: string) => void
  collapsedByTodo: Record<string, boolean>
  defaultCollapsed: boolean
  onSubtaskCollapsedChange?: (todoId: string, collapsed: boolean) => void
}

export function TodoList({
  project,
  todos,
  editingId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onToggleDone,
  onStatusClick,
  onReorder,
  onAdd,
  collapsedByTodo,
  defaultCollapsed,
  onSubtaskCollapsedChange,
}: Props) {
  const listRef = useRef<HTMLUListElement>(null)
  const draggedIdRef = useRef<string | null>(null)
  const { state } = useStore()

  const topLevel = todos.filter((t) => !t.parentId)
  const sorted = [...topLevel].sort((a, b) => {
    const aDone = (() => {
      const p = state.projects.find((pr) => pr.id === a.projectId)
      if (!p) return false
      const statuses = a.statuses ?? p.statuses
      if (statuses.length > 0) return a.statusIndex >= statuses.length - 1
      return a.statusIndex < 0
    })()
    const bDone = (() => {
      const p = state.projects.find((pr) => pr.id === b.projectId)
      if (!p) return false
      const statuses = b.statuses ?? p.statuses
      if (statuses.length > 0) return b.statusIndex >= statuses.length - 1
      return b.statusIndex < 0
    })()
    if (project.autoSortDone !== false && aDone !== bDone) return aDone ? 1 : -1
    return a.sortOrder - b.sortOrder
  })

  if (topLevel.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-[var(--ink-muted)]">
        <span className="mb-2 block text-[2rem] opacity-30">&#x1F4DD;</span>
        <p className="font-heading text-[0.9rem] italic text-[var(--ink-muted)]">
          {project.myRole === "view" ? "暂无任务" : "还没有任务，添加一条吧"}
        </p>
      </div>
    )
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    draggedIdRef.current = id
    const el = (e.target as HTMLElement).closest(".todo-item") as HTMLElement
    el?.classList.add("dragging")
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", id)
  }

  function handleDragEnd(e: React.DragEvent) {
    draggedIdRef.current = null
    const el = (e.target as HTMLElement).closest(".todo-item") as HTMLElement
    el?.classList.remove("dragging")
    listRef.current?.querySelectorAll(".todo-item").forEach((el) => el.classList.remove("drag-over"))
  }

  function handleDragOver(e: React.DragEvent) {
    // Ignore subtask drags (handled inside TodoItem)
    if (e.dataTransfer.types.includes("application/x-todo-subtask")) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    const el = (e.target as HTMLElement).closest(".todo-item") as HTMLElement
    if (el && !el.classList.contains("dragging")) el.classList.add("drag-over")
  }

  function handleDragLeave(e: React.DragEvent) {
    const el = (e.target as HTMLElement).closest(".todo-item") as HTMLElement
    el?.classList.remove("drag-over")
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.types.includes("application/x-todo-subtask")) return
    const dropTarget = (e.target as HTMLElement).closest(".todo-item") as HTMLElement | null
    if (!dropTarget) return
    dropTarget.classList.remove("drag-over")

    const draggedId = draggedIdRef.current
    const targetId = dropTarget.dataset.id
    if (!draggedId || !targetId || draggedId === targetId) return

    // Find indices in the sorted data array (not DOM)
    const fromIdx = sorted.findIndex((t) => t.id === draggedId)
    const toIdx = sorted.findIndex((t) => t.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return

    // Compute new order by reinserting the dragged item at the target position
    const reordered = [...sorted]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)

    // Assign sequential sortOrder and dispatch
    reordered.forEach((t, i) => {
      if (t.sortOrder !== i) onReorder(t.id, i)
    })
  }

  return (
    <ul ref={listRef} className="todo-list list-none">
      {sorted.map((todo, i) => (
        <div
          key={todo.id}
          className="todo-item"
          data-id={todo.id}
          draggable={!editingId && project.myRole !== "view"}
          onDragStart={project.myRole !== "view" ? (e) => handleDragStart(e, todo.id) : undefined}
          onDragEnd={project.myRole !== "view" ? handleDragEnd : undefined}
          onDragOver={project.myRole !== "view" ? handleDragOver : undefined}
          onDragLeave={project.myRole !== "view" ? handleDragLeave : undefined}
          onDrop={project.myRole !== "view" ? handleDrop : undefined}
        >
          <TodoItem
            todo={todo}
            project={project}
            index={i}
            isEditing={editingId === todo.id}
            editingId={editingId}
            onStartEdit={onStartEdit}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onDelete={onDelete}
            onToggleDone={onToggleDone}
            onStatusClick={onStatusClick}
            onAdd={onAdd}
            onReorder={onReorder}
            collapsed={collapsedByTodo[todo.id] ?? defaultCollapsed}
            onCollapsedChange={(collapsed) =>
              onSubtaskCollapsedChange?.(todo.id, collapsed)
            }
          />
        </div>
      ))}
    </ul>
  )
}
