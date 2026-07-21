import type { Project } from "../types"
import { useStore, isTodoDone } from "../store/todoStore"
import { getStatusColors } from "../utils/colors"

interface Props {
  project: Project | null
  onClearDone: () => void
}

export function Footer({ project, onClearDone }: Props) {
  const { state } = useStore()

  if (!project) return null

  const todos = state.todos.filter((t) => t.projectId === project.id)
  const isMulti = project.statuses.length > 0
  const colors = isMulti ? getStatusColors(project.color, project.statuses.length) : []
  const total = todos.length
  const done = todos.filter((t) => isTodoDone(t, project.id, state)).length

  return (
    <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[0.6875rem] text-[var(--ink-dim)]">
      <div className="flex flex-wrap items-center gap-[0.375rem]">
        {isMulti ? (
          <>
            {project.statuses.map((s, i) => {
              const count = todos.filter((t) => {
                const name = project.statuses[t.statusIndex] || project.statuses[project.statuses.length - 1]
                return name === s
              }).length
              if (count === 0) return null
              const color = colors[i] || "#94a3b8"
              return (
                <span
                  key={i}
                  className="inline-block rounded-[4px] px-[0.45rem] py-[0.1rem] text-[0.625rem] font-semibold"
                  style={{ background: `${color}22`, color }}
                >
                  {s} {count}
                </span>
              )
            })}
            {total === 0 && <span>暂无任务</span>}
          </>
        ) : (
          <span>{total === 0 ? "暂无任务" : `共 ${total} 项，已完成 ${done} 项`}</span>
        )}
      </div>
      {done > 0 && project.myRole !== "view" && (
        <button
          onClick={onClearDone}
          className="cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-[0.3rem] font-[var(--font-body)] text-[0.6875rem] font-medium text-[var(--ink-dim)] transition-all duration-[0.12s] hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]"
        >
          清除已完成
        </button>
      )}
    </footer>
  )
}
