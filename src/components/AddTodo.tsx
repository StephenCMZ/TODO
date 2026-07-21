import { useState, useRef, type FormEvent } from "react"
import type { Project } from "../types"

interface Props {
  project: Project
  onAdd: (text: string) => void
}

export function AddTodo({ project, onAdd }: Props) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // View-only members cannot add tasks
  if (project.myRole === "view") return null

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    const text = value.trim()
    if (!text) return
    onAdd(text)
    setValue("")
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="mb-5 flex gap-2">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="添加新任务…"
        maxLength={200}
        autoFocus
        className="flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-[0.65rem] font-[var(--font-body)] text-[0.875rem] text-[var(--ink)] outline-none transition-all duration-[0.2s] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_2px_rgba(201,112,46,0.12)]"
      />
      <button
        type="submit"
        className="cursor-pointer whitespace-nowrap rounded-[var(--radius)] bg-[var(--accent)] px-5 py-[0.65rem] text-[0.8125rem] font-semibold text-white transition-all duration-[0.18s] hover:bg-[var(--accent-deep)]"
      >
        添加
      </button>
    </form>
  )
}
