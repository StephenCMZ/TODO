import { useStore, isTodoDone } from "../store/todoStore"

interface Props {
  currentProject: string | null
  onSelectProject: (id: string) => void
  canManageProjects: boolean
  currentProjectRole?: string | null
  onAddProject: () => void
  onEditProject: () => void
  onDeleteProject: () => void
}

export function ProjectBar({
  currentProject,
  onSelectProject,
  canManageProjects,
  currentProjectRole,
  onAddProject,
  onEditProject,
  onDeleteProject,
}: Props) {
  const { state } = useStore()

  return (
    <div className="mb-6 flex flex-wrap items-center gap-[0.4rem]">
      {state.projects.map((p) => {
        const active = p.id === currentProject
        const count = state.todos.filter((t) => {
          if (t.projectId !== p.id) return false
          return !isTodoDone(t, p.id, state)
        }).length

        return (
          <button
            key={p.id}
            onClick={() => onSelectProject(p.id)}
            className="flex cursor-pointer items-center gap-[0.35rem] rounded-full border px-[0.75rem] py-[0.35rem] pl-[0.85rem] text-[0.75rem] font-medium leading-tight transition-all duration-[0.18s]"
            style={{
              background: active ? p.color : "transparent",
              color: active ? "#fff" : "var(--ink-dim)",
              borderColor: active ? p.color : "var(--border)",
            }}
          >
            {p.name}
            <span
              className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-[0.25rem] text-[0.6rem] font-semibold leading-none"
              style={
                active
                  ? { background: "rgba(255,255,255,.2)", color: "rgba(255,255,255,.9)" }
                  : { background: "var(--border-light)", color: "var(--ink-dim)" }
              }
            >
              {count}
            </span>
          </button>
        )
      })}

      <div className="ml-auto flex gap-[0.2rem] self-center">
        {canManageProjects && (
          <button onClick={onAddProject} title="新建项目" className="icon-btn">+</button>
        )}
        {currentProjectRole && (
          <>
            <button onClick={onEditProject} title="编辑项目" className="icon-btn">&#9998;</button>
            {currentProjectRole === "manage" && (
              <button onClick={onDeleteProject} title="删除项目" className="icon-btn">&#10005;</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
