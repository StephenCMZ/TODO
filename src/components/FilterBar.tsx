import { getStatusColors } from "../utils/colors"

interface Props {
  statuses: string[]
  projectColor: string
  filterStatus: string | null
  onFilterChange: (v: string | null) => void
}

export function FilterBar({ statuses, projectColor, filterStatus, onFilterChange }: Props) {
  const isMulti = statuses.length > 0
  const colors = isMulti ? getStatusColors(projectColor, statuses.length) : []

  return (
    <div className="mb-4 flex flex-wrap gap-1">
      <FilterBtn active={filterStatus === null} onClick={() => onFilterChange(null)}>
        全部
      </FilterBtn>

      {isMulti
        ? statuses.map((s, i) => {
            const dotColor = colors[i] || "#94a3b8"
            return (
              <FilterBtn
                key={i}
                active={filterStatus === String(i)}
                onClick={() => onFilterChange(String(i))}
              >
                <span
                  className="mr-[3px] inline-block h-[6px] w-[6px] rounded-full"
                  style={{ background: dotColor }}
                />
                {s}
              </FilterBtn>
            )
          })
        : <>
            <FilterBtn active={filterStatus === "undone"} onClick={() => onFilterChange("undone")}>
              未完成
            </FilterBtn>
            <FilterBtn active={filterStatus === "done"} onClick={() => onFilterChange("done")}>
              已完成
            </FilterBtn>
          </>}
    </div>
  )
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-[4px] border-none px-[0.6rem] py-[0.2rem] font-[var(--font-body)] text-[0.6875rem] font-medium transition-all duration-[0.12s] ${
        active
          ? "font-semibold text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--border)]"
          : "text-[var(--ink-dim)] hover:bg-white/5 hover:text-[var(--ink)]"
      }`}
      style={active ? { background: "rgba(255,255,255,0.06)" } : { background: "transparent" }}
    >
      {children}
    </button>
  )
}
