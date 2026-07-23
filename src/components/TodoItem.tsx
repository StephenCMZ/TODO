import { useState, useRef, useEffect } from "react"
import type { Todo, Project } from "../types"
import { isTodoDone, useStore } from "../store/todoStore"
import { StatusBar } from "./StatusBar"

interface Props {
  todo: Todo
  project: Project
  index: number
  isEditing: boolean
  editingId: string | null
  onStartEdit: (id: string) => void
  onSaveEdit: (id: string, text: string) => void
  onCancelEdit: () => void
  onDelete: (id: string) => void
  onToggleDone: (id: string) => void
  onStatusClick: (id: string, idx: number) => void
  onAdd: (text: string, parentId: string) => void
}

export function TodoItem({
  todo,
  project,
  index,
  isEditing,
  editingId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onToggleDone,
  onStatusClick,
  onAdd,
}: Props) {
  const { state, setTodoStatuses } = useStore()
  const effectiveStatuses = todo.statuses ?? project.statuses
  const isMulti = effectiveStatuses.length > 0
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

  const [editValue, setEditValue] = useState(todo.text)
  const [editStatuses, setEditStatuses] = useState<string[]>(effectiveStatuses)
  const [explicitCheckbox, setExplicitCheckbox] = useState(false)
  const editRef = useRef<HTMLInputElement>(null)

  // Subtask data
  const subtasks = state.todos
    .filter((t) => t.parentId === todo.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const [collapsed, setCollapsed] = useState(true)

  // Subtask add input
  const [showSubtaskInput, setShowSubtaskInput] = useState(false)
  const [subtaskValue, setSubtaskValue] = useState("")
  const subtaskInputRef = useRef<HTMLInputElement>(null)

  // Subtask editing state
  const [subtaskEditValue, setSubtaskEditValue] = useState("")
  const subtaskEditRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus()
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length)
    }
  }, [isEditing])

  useEffect(() => {
    setEditValue(todo.text)
    setEditStatuses(effectiveStatuses)
    setExplicitCheckbox(todo.statuses !== undefined && todo.statuses.length === 0)
  }, [todo.text, isEditing])

  // Auto-focus subtask input when shown
  useEffect(() => {
    if (showSubtaskInput && subtaskInputRef.current) {
      subtaskInputRef.current.focus()
    }
  }, [showSubtaskInput])

  // Initialize subtask edit value when editing a subtask
  useEffect(() => {
    const editingSubtask = subtasks.find((st) => st.id === editingId)
    if (editingSubtask) {
      setSubtaskEditValue(editingSubtask.text)
      // Auto-focus after state update
      setTimeout(() => subtaskEditRef.current?.focus(), 0)
    }
  }, [editingId])

  function handleSave(val: string) {
    if (!val) return
    if (explicitCheckbox) {
      setTodoStatuses(todo.id, [])
    } else {
      const cleaned = editStatuses.map((s) => s.trim()).filter(Boolean)
      const isCustom = JSON.stringify(cleaned) !== JSON.stringify(project.statuses)
      setTodoStatuses(todo.id, isCustom && cleaned.length > 0 ? cleaned : undefined)
    }
    onSaveEdit(todo.id, val)
  }

  function handleCancel() {
    setEditStatuses(effectiveStatuses)
    setExplicitCheckbox(false)
    onCancelEdit()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave(editValue.trim())
    if (e.key === "Escape") handleCancel()
  }

  function switchToCheckbox() {
    setEditStatuses([])
    setExplicitCheckbox(true)
  }

  function addStatus() {
    setEditStatuses([...editStatuses, ""])
    if (explicitCheckbox) setExplicitCheckbox(false)
  }

  function removeStatus(idx: number) {
    setEditStatuses(editStatuses.filter((_, i) => i !== idx))
  }

  function updateStatus(idx: number, value: string) {
    const next = [...editStatuses]
    next[idx] = value
    setEditStatuses(next)
  }

  function resetStatuses() {
    setEditStatuses(project.statuses.length > 0 ? [...project.statuses] : [])
    setExplicitCheckbox(false)
  }

  const borderColor = done ? "transparent" : project.color

  // ── Subtask handlers ──

  // When parent toggled, cascade to all subtasks
  function handleToggleWithSubtasks() {
    if (done) {
      subtasks.forEach((st) => {
        if (st.statusIndex < 0) onToggleDone(st.id)
      })
    } else {
      subtasks.forEach((st) => {
        if (st.statusIndex >= 0) onToggleDone(st.id)
      })
    }
    onToggleDone(todo.id)
  }

  // When a subtask is toggled, sync parent state
  function handleToggleSubtask(subtaskId: string) {
    const wasDone = state.todos.find((t) => t.id === subtaskId)?.statusIndex === -1
    onToggleDone(subtaskId)
    if (wasDone) {
      // Subtask was unchecked — also uncheck parent if it's done
      if (done) {
        if (effectiveStatuses.length > 0) {
          onStatusClick(todo.id, 0)
        } else {
          onToggleDone(todo.id)
        }
      }
      return
    }
    // Subtask was checked — auto-complete parent if all subtasks done
    if (!project.autoCompleteParent || done) return
    const allOthersDone = subtasks
      .filter((st) => st.id !== subtaskId)
      .every((st) => (st.statusIndex ?? 0) < 0)
    if (allOthersDone) {
      if (effectiveStatuses.length > 0) {
        onStatusClick(todo.id, effectiveStatuses.length - 1)
      } else {
        onToggleDone(todo.id)
      }
    }
  }

  function handleAddSubtask() {
    setShowSubtaskInput(true)
    setCollapsed(false)
  }

  function handleSubtaskSubmit() {
    const text = subtaskValue.trim()
    if (!text) return
    onAdd(text, todo.id)
    setSubtaskValue("")
    setShowSubtaskInput(false)
  }

  function handleSubtaskKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSubtaskSubmit()
    if (e.key === "Escape") {
      setSubtaskValue("")
      setShowSubtaskInput(false)
    }
  }

  function handleSubtaskEditKeyDown(e: React.KeyboardEvent, stId: string) {
    if (e.key === "Enter") {
      const val = subtaskEditValue.trim()
      if (val) onSaveEdit(stId, val)
    }
    if (e.key === "Escape") onCancelEdit()
  }

  function getSubtaskTime(created: number) {
    if (project.showTime === false) return ""
    return new Date(created).toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

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
            <button
              onClick={() => handleSave(editValue.trim())}
              className="edit-btn"
              title="保存"
            >
              &#x1F4BE;
            </button>
            <button onClick={handleCancel} className="delete-btn" title="取消">
              &#10005;
            </button>
          </div>
        </div>

        {editStatuses.length > 0 && !explicitCheckbox && (
          <div className="mt-2 border-t border-[var(--border-light)] pt-2">
            <div className="mb-1 text-[0.65rem] font-medium text-[var(--ink-muted)]">
              状态节点
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {editStatuses.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-0 rounded-[4px] border border-[var(--border-light)] bg-[var(--surface)] pl-2"
                >
                  <input
                    value={s}
                    onChange={(e) => updateStatus(i, e.target.value)}
                    placeholder={`状态 ${i + 1}`}
                    className="w-16 bg-transparent py-1 text-[0.7rem] text-[var(--ink)] outline-none"
                  />
                  <button
                    onClick={() => removeStatus(i)}
                    className="flex h-full items-center px-1 text-[0.55rem] text-[var(--ink-dim)] hover:text-red-500"
                  >
                    &#10005;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`flex flex-wrap items-center gap-1 ${editStatuses.length > 0 ? "mt-1" : "mt-2"}`}>
          {explicitCheckbox && editStatuses.length === 0 ? (
            <span className="flex items-center gap-1 rounded-[4px] px-2 py-1 text-[0.65rem] text-[var(--ink-muted)]">
              &#x2611; 简单勾选模式
            </span>
          ) : (
            <button
              onClick={addStatus}
              className="flex items-center gap-1 rounded-[4px] border border-dashed border-[var(--border-light)] px-2 py-1 text-[0.65rem] text-[var(--ink-dim)] hover:text-[var(--accent)]"
            >
              + {editStatuses.length === 0 ? "添加状态节点" : "添加"}
            </button>
          )}
          {!explicitCheckbox && (todo.statuses || (project.statuses.length > 0 && editStatuses.length !== project.statuses.length)) && (
            <button
              onClick={resetStatuses}
              className="rounded-[4px] border border-[var(--border-light)] px-2 py-1 text-[0.6rem] text-[var(--ink-dim)] hover:text-[var(--ink)]"
            >
              &#8635; 重置为项目默认
            </button>
          )}
          {project.statuses.length > 0 && (todo.statuses || effectiveStatuses.length > 0) && !explicitCheckbox && (
            <button
              onClick={switchToCheckbox}
              className="cursor-pointer border-none bg-transparent px-[0.5rem] py-[0.25rem] font-[var(--font-body)] text-[0.6875rem] text-[var(--ink-muted)] underline decoration-[var(--border)] underline-offset-3 transition-colors duration-[0.12s] hover:text-[var(--accent)] hover:decoration-[var(--accent-light)]"
            >
              切换简单勾选模式
            </button>
          )}
          {explicitCheckbox && (
            <button
              onClick={addStatus}
              className="flex items-center gap-1 rounded-[4px] border border-dashed border-[var(--border-light)] px-2 py-1 text-[0.65rem] text-[var(--ink-dim)] hover:text-[var(--accent)]"
            >
              + 重新添加状态节点
            </button>
          )}
        </div>

        {editStatuses.length > 0 && !explicitCheckbox && (
          <StatusBar
            statuses={editStatuses}
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

        {subtasks.length > 0 && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex cursor-pointer items-center justify-center border-none bg-transparent p-0 text-[0.65rem] text-[var(--ink-muted)] transition-transform duration-[0.15s] hover:text-[var(--ink)]"
            title={collapsed ? "展开子任务" : "折叠子任务"}
          >
            <span style={{ display: "inline-block", transform: collapsed ? "rotate(0deg)" : "rotate(90deg)", transition: "transform 0.15s" }}>
              &#x25B6;
            </span>
          </button>
        )}

        {isMulti ? (
          <span
            className={`flex-1 text-[0.9375rem] leading-relaxed tracking-[0.01em] ${done ? "text-[var(--ink-muted)] line-through" : "text-[var(--ink)]"}`}
          >
            {done && (
              <span
                className="check-icon mr-[0.35rem] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.5rem] font-bold"
                style={{ background: project.color, color: "#fff" }}
              >
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
              onChange={isViewOnly ? undefined : handleToggleWithSubtasks}
              className="cb h-4 w-4 shrink-0 rounded-[2px] transition-transform duration-[0.12s]"
              style={{ accentColor: project.color, cursor: isViewOnly ? "default" : "pointer" }}
              readOnly={isViewOnly}
            />
            <span
              className={`flex-1 break-words text-[0.9375rem] leading-relaxed tracking-[0.01em] ${done ? "text-[var(--ink-muted)] line-through" : "text-[var(--ink)]"}`}
            >
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
            <button onClick={handleAddSubtask} className="edit-btn" title="添加子任务">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z"/>
              </svg>
            </button>
            <button onClick={() => onDelete(todo.id)} className="delete-btn" title="删除">
              &#x1F5D1;
            </button>
          </div>
        )}
      </div>

      {isMulti && (
        <StatusBar
          statuses={effectiveStatuses}
          projectColor={project.color}
          currentIndex={todo.statusIndex}
          todoId={todo.id}
          onStatusClick={isViewOnly ? () => {} : (id, idx) => {
            if (id === todo.id && idx >= effectiveStatuses.length - 1) {
              subtasks.forEach((st) => {
                if (st.statusIndex >= 0) onToggleDone(st.id)
              })
            }
            onStatusClick(id, idx)
          }}
        />
      )}

      {/* ── Subtasks section ── */}
      {!collapsed && (subtasks.length > 0 || showSubtaskInput) && (
        <div className="ml-5 mt-3 border-l-2 border-[var(--border-light)] pl-4">
          {subtasks.map((st) => {
            const stDone = st.statusIndex < 0

            if (editingId === st.id) {
              return (
                <div key={st.id} className="mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={subtaskEditRef}
                      value={subtaskEditValue}
                      onChange={(e) => setSubtaskEditValue(e.target.value)}
                      onKeyDown={(e) => handleSubtaskEditKeyDown(e, st.id)}
                      maxLength={200}
                      className="flex-1 rounded-[var(--radius-sm)] border border-[var(--accent)] bg-[var(--surface)] px-2 py-1 text-[0.8rem] text-[var(--ink)] outline-none"
                    />
                    <button
                      onClick={() => {
                        const val = subtaskEditValue.trim()
                        if (val) onSaveEdit(st.id, val)
                      }}
                      className="edit-btn"
                      title="保存"
                    >
                      &#x1F4BE;
                    </button>
                    <button onClick={onCancelEdit} className="delete-btn" title="取消">
                      &#10005;
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div key={st.id} className="mb-1.5 flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={stDone}
                  onChange={isViewOnly ? undefined : () => handleToggleSubtask(st.id)}
                  className="cb h-3.5 w-3.5 shrink-0"
                  style={{ accentColor: project.color, cursor: isViewOnly ? "default" : "pointer" }}
                  readOnly={isViewOnly}
                />
                <span
                  className={`flex-1 break-words text-[0.825rem] leading-relaxed ${stDone ? "text-[var(--ink-muted)] line-through" : "text-[var(--ink)]"}`}
                >
                  {st.text}
                </span>
                {getSubtaskTime(st.created) && (
                  <span className="shrink-0 text-[0.55rem] text-[var(--ink-muted)] [font-feature-settings:'tnum'_1]">
                    {getSubtaskTime(st.created)}
                  </span>
                )}
                {!isViewOnly && (
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      onClick={() => onStartEdit(st.id)}
                      className="edit-btn"
                      title="编辑"
                    >
                      &#9998;
                    </button>
                    <button
                      onClick={() => onDelete(st.id)}
                      className="delete-btn"
                      title="删除"
                    >
                      &#x1F5D1;
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {showSubtaskInput && (
            <div className="mb-1.5 flex items-center gap-2 py-1">
              <input
                ref={subtaskInputRef}
                value={subtaskValue}
                onChange={(e) => setSubtaskValue(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                placeholder="子任务…"
                maxLength={200}
                className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[0.8rem] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
              />
              <button onClick={handleSubtaskSubmit} className="edit-btn" title="添加">
                &#x1F4BE;
              </button>
              <button
                onClick={() => {
                  setSubtaskValue("")
                  setShowSubtaskInput(false)
                }}
                className="delete-btn"
                title="取消"
              >
                &#10005;
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
