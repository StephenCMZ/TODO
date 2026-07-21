import { Fragment } from "react"
import { getStatusColors } from "../utils/colors"

interface Props {
  statuses: string[]
  projectColor: string
  currentIndex: number
  todoId: string
  onStatusClick: (id: string, idx: number) => void
}

export function StatusBar({ statuses, projectColor, currentIndex, todoId, onStatusClick }: Props) {
  const colors = getStatusColors(projectColor, statuses.length)
  const l = statuses.length
  const isLast = currentIndex >= l - 1

  return (
    <div className="mt-2 flex items-center gap-0 border-t border-[var(--border-light)] pt-[0.45rem]">
      {statuses.map((s, i) => {
        const cls = i === currentIndex ? "current" : i < currentIndex ? "past" : "future"
        const c = colors[i] || "#94a3b8"
        const fill = i <= currentIndex ? c : "#d1d5db"

        return (
            <Fragment key={i}>
              <button
              onClick={() => onStatusClick(todoId, i)}
              className={`status-node ${cls}`}
            >
              <span
                className="sd"
                style={{
                  background: i < currentIndex ? c : fill,
                  color: i < currentIndex ? "#fff" : undefined,
                }}
              >
                {i < currentIndex ? "✓" : ""}
              </span>
              {s}
            </button>
            {i < l - 1 && (
              <div
                className="flex-1 min-w-[8px] h-[1px] mx-[2px] shrink"
                style={{ background: i < currentIndex ? c : "#d1d5db" }}
              />
            )}
          </Fragment>
        )
      })}
      {isLast && (
        <span
          className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.5rem] font-bold"
          style={{ background: colors[l - 1] || "#94a3b8", color: "#fff" }}
        >
          &#10003;
        </span>
      )}
    </div>
  )
}
