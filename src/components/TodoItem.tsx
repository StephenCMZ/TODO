import { useState, useRef, useEffect } from "react"
import type { Todo, Project } from "../types"
import { isTodoDone } from "../store/todoStore"
import { StatusBar } from "./StatusBar"

interface Props {
  todo: Todo
  project: Project
  index: number
  isEditing: boolean
  onStartEdit: (id: string) => void
  onSaveEdit: (id: string, text: string) => void
  onCancelEdit: () => void
  onDelete: (id: string) => void
  onToggleDone: (id: string) => void
  onStatusClick: (id: string, idx: number) => void
}

export function TodoItem({
  todo,
  project,
  index,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onToggleDone,
  onStatusClick,
}: Props) {
  const [editValue, setEditValue] = useState(todo.text)
  const editRef = useRef<HTMLInputElement>(null)
  const isMulti = project.statuses.length > 0
  const done = isTodoDone(todo, project.id, { projects: [project], todos: [], defaultProjectId: "" } as any)
  const timeStr =
    project.showTime !== false
      ? new Date(todo.created).toLocaleString("zh-CN", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : ""
  const isViewOnly = project.myRole === "view"

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus()
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length)
    }
  }, [isEditing])

  useEffect(() => {
    setEditValue(todo.text)
  }, [todo.text, isEditing])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      const val = editValue.trim()
      if (val) onSaveEdit(todo.id, val)
    }
    if (e.key === "Escape") onCancelEdit()
  }

  const borderColor = done ? "transparent" : project.color

  if (isEditing) {
    return (
      <li
        className="animate-[slideUp_0.3s_ease_both] mb-[0.4rem] rounded-[var(--radius)] border border-[var(--border-light)] bg-[var(--surface)] px-4 py-[0.65rem] pt-3 transition-all duration-[0.25s]"
        style={
          {
            "--todo-color": borderColor,
            animationDelay: `${index * 0.05}s`,
            borderLeft: "2px solid var(--todo-color, transparent)",
          } as React.CSSProperties
        }
      >
        <div className="flex items-center gap-[0.65rem]">
          <input
            ref={editRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={200}
            className="flex-1 rounded-[var(--radius-sm)] border border-[var(--accent)] bg-[var(--surface)] px-[0.6rem] py-[0.35rem] font-[var(--font-body)] text-[0.875rem] text-[var(--ink)] shadow-[0_0_0_2px_rgba(201,112,46,0.12)] outline-none"
          />
          <div className="flex shrink-0 gap-[0.125rem]">
            <button onClick={() => { const val = editValue.trim(); if (val) onSaveEdit(todo.id, val) }} className="edit-btn" title="保存">
              &#x1F4BE;
            </button>
            <button onClick={onCancelEdit} className="delete-btn" title="取消">
              &#10005;
            </button>
          </div>
        </div>
        {isMulti && (
          <StatusBar
            statuses={project.statuses}
            projectColor={project.color}
            currentIndex={todo.statusIndex}
            todoId={todo.id}
            onStatusClick={onStatusClick}
          />
        )}
      </li>
    )
  }

  return (
    <li
      className="todo-item group mb-[0.4rem] rounded-[var(--radius)] border border-[var(--border-light)] bg-[var(--surface)] px-4 py-[0.65rem] pt-3 transition-all duration-[0.25s] hover:border-[var(--border)]"
      data-id={todo.id}
      style={
        {
          "--todo-color": borderColor,
          animation: `slideUp 0.3s ease both`,
          animationDelay: `${index * 0.05}s`,
          borderLeft: "2px solid var(--todo-color, transparent)",
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-[0.65rem]">
        {project.showIndex !== false && (
          <span className="shrink-0 text-[0.6875rem] font-medium text-[var(--ink-muted)] [font-feature-settings:'tnum'_1]">
            {index + 1}
          </span>
        )}

        {isMulti ? (
          <span className={`flex-1 text-[0.9375rem] leading-relaxed tracking-[0.01em] ${done ? "text-[var(--ink-muted)] line-through" : "text-[var(--ink)]"}`}>
            {done && (
              <span className="check-icon mr-[0.35rem] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.5rem] font-bold" style={{ background: project.color, color: "#fff" }}>
                &#10003;
              </span>
            )}
            {todo.text}
          </span>
        ) : (
          <>
            <input
              type="checkbox"
              checked={done}
              onChange={isViewOnly ? undefined : () => onToggleDone(todo.id)}
              className="cb h-4 w-4 shrink-0 rounded-[2px] transition-transform duration-[0.12s]"
              style={{ accentColor: project.color, cursor: isViewOnly ? "default" : "pointer" }}
              readOnly={isViewOnly}
            />
            <span className={`flex-1 text-[0.9375rem] leading-relaxed tracking-[0.01em] break-words ${done ? "text-[var(--ink-muted)] line-through" : "text-[var(--ink)]"}`}>
              {todo.text}
            </span>
          </>
        )}

        {project.showTime !== false && timeStr && (
          <span className="shrink-0 text-[0.6rem] text-[var(--ink-muted)] [font-feature-settings:'tnum'_1]">
            {timeStr}
          </span>
        )}

        {!isViewOnly && (
          <div className="flex shrink-0 gap-[0.125rem]">
            <button onClick={() => onStartEdit(todo.id)} className="edit-btn" title="编辑">
              &#9998;
            </button>
            <button onClick={() => onDelete(todo.id)} className="delete-btn" title="删除">
              &#x1F5D1;
            </button>
          </div>
        )}
      </div>

      {isMulti && (
        <StatusBar
          statuses={project.statuses}
          projectColor={project.color}
          currentIndex={todo.statusIndex}
          todoId={todo.id}
          onStatusClick={isViewOnly ? () => {} : onStatusClick}
        />
      )}
    </li>
  )
}
