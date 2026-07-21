import { useState, useEffect, useCallback } from "react"
import { AuthProvider, useAuth } from "./store/authStore"
import { StoreProvider, useStore } from "./store/todoStore"
import { useTheme } from "./hooks/useTheme"
import { Header } from "./components/Header"
import { ThemeToggle } from "./components/ThemeToggle"
import { UserMenu } from "./components/UserMenu"
import { LoginPage } from "./components/LoginPage"
import { RegisterPage } from "./components/RegisterPage"
import { ForgotPasswordPage } from "./components/ForgotPasswordPage"
import { ResetPasswordPage } from "./components/ResetPasswordPage"
import { AdminPanel } from "./components/AdminPanel"
import { ProjectBar } from "./components/ProjectBar"
import { AddTodo } from "./components/AddTodo"
import { FilterBar } from "./components/FilterBar"
import { TodoList } from "./components/TodoList"
import { Footer } from "./components/Footer"
import { FooterBanner } from "./components/FooterBanner"
import { ProjectModal } from "./components/ProjectModal"
import { ConfirmModal } from "./components/ConfirmModal"
import type { ProjectSettings } from "./types"

/* ── Auth gate ── */

function AuthGate({ children }: { children: React.ReactNode }) {
  const { state } = useAuth()
  const [authPage, setAuthPage] = useState<"login" | "register" | "forgot" | "reset">("login")
  const [resetToken, setResetToken] = useState("")
  const { login, register, forgotPassword, resetPassword } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const [publicSettings, setPublicSettings] = useState({ registrationEnabled: true, forgotPasswordEnabled: true })

  useEffect(() => {
    fetch("/api/auth/public-settings")
      .then((r) => r.json())
      .then((s) => setPublicSettings(s))
      .catch(() => {})
  }, [])

  if (state === "loading") {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <p className="font-[var(--font-heading)] text-[1rem] italic text-[var(--ink-muted)]">Loading...</p>
      </div>
    )
  }

  if (state === "unauthenticated") {
    const themeToggle = <div className="fixed right-4 top-4 z-50"><ThemeToggle theme={theme} onToggle={toggleTheme} /></div>
    const showLogin = authPage === "login" || (authPage === "register" && !publicSettings.registrationEnabled) || (authPage === "forgot" && !publicSettings.forgotPasswordEnabled)
    switch (showLogin ? "login" : authPage) {
      case "login":
        return (
          <>
            {themeToggle}
            <LoginPage
              onLogin={login}
              onSwitchToRegister={() => setAuthPage("register")}
              onSwitchToForgot={() => setAuthPage("forgot")}
              showRegister={publicSettings.registrationEnabled}
              showForgotPassword={publicSettings.forgotPasswordEnabled}
            />
          </>
        )
      case "register":
        return (
          <>
            {themeToggle}
            <RegisterPage
              onRegister={register}
              onSwitchToLogin={() => setAuthPage("login")}
            />
          </>
        )
      case "forgot":
        return (
          <>
            {themeToggle}
            <ForgotPasswordPage
              onForgotPassword={forgotPassword}
              onBackToLogin={() => setAuthPage("login")}
              onShowReset={(token) => { setResetToken(token); setAuthPage("reset") }}
            />
          </>
        )
      case "reset":
        return (
          <>
            {themeToggle}
            <ResetPasswordPage
              onResetPassword={resetPassword}
              onBackToLogin={() => setAuthPage("login")}
              initialToken={resetToken}
            />
          </>
        )
    }
  }

  return <>{children}</>
}

/* ── App inner (authenticated) ── */

function AppInner() {
  const { state, loading, addProject, updateProject, deleteProject, addTodo, deleteTodo, renameTodo, toggleTodoDone, setTodoStatus, reorderTodo, clearDone, reload } = useStore()
  const { user: authUser, logout, refreshUser } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()

  const [currentProject, setCurrentProject] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [projectModal, setProjectModal] = useState<{ isOpen: boolean; mode: "add" | "rename" }>({
    isOpen: false,
    mode: "add",
  })
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [clearDoneConfirm, setClearDoneConfirm] = useState(false)
  const [page, setPage] = useState<"app" | "admin">("app")

  useEffect(() => {
    if (loading) return
    const currentStillExists = currentProject && state.projects.find((p) => p.id === currentProject)
    if (currentStillExists) return
    const urlProject = new URLSearchParams(location.search).get("project")
    if (urlProject && state.projects.find((p) => p.id === urlProject)) {
      setCurrentProject(urlProject)
    } else if (state.projects.length > 0) {
      setCurrentProject(state.projects[0].id)
    } else {
      setCurrentProject(null)
    }
  }, [loading, state.projects, currentProject])

  // Re-fetch data on mount (e.g. after login when initial load ran unauthenticated)
  useEffect(() => { reload() }, [])

  // Refresh user data when returning from admin page
  useEffect(() => {
    if (page === "app") refreshUser()
  }, [page, refreshUser])

  const canManageProjects = authUser?.role === "admin" || authUser?.role === "project_admin"
  const project = currentProject ? state.projects.find((p) => p.id === currentProject) || null : null
  const todos = currentProject ? state.todos.filter((t) => t.projectId === currentProject) : []

  let visibleTodos = todos
  if (project) {
    if (project.showDone === false) {
      visibleTodos = visibleTodos.filter((t) => {
        const done =
          project.statuses.length > 0
            ? t.statusIndex >= project.statuses.length - 1
            : t.statusIndex < 0
        return !done
      })
    }
    if (filterStatus !== null) {
      if (project.statuses.length > 0) {
        const idx = parseInt(filterStatus)
        visibleTodos = visibleTodos.filter((t) => t.statusIndex === idx)
      } else {
        const showDoneFilter = filterStatus === "done"
        visibleTodos = visibleTodos.filter((t) => {
          const done =
            project.statuses.length > 0
              ? t.statusIndex >= project.statuses.length - 1
              : t.statusIndex < 0
          return done === showDoneFilter
        })
      }
    }
  }

  const selectProject = useCallback((id: string) => {
    setCurrentProject(id)
    setEditingId(null)
    setFilterStatus(null)
    history.replaceState(null, "", "?project=" + id)
  }, [])

  const handleAddProject = useCallback(
    async (name: string, color: string, statuses: string[], _settings: ProjectSettings) => {
      const id = await addProject(name, color, statuses)
      setCurrentProject(id)
      history.replaceState(null, "", "?project=" + id)
    },
    [addProject],
  )

  const handleUpdateProject = useCallback(
    async (name: string, color: string, statuses: string[], settings: ProjectSettings) => {
      if (!currentProject) return
      await updateProject(currentProject, name, color, statuses, settings)
    },
    [currentProject, updateProject],
  )

  const handleDeleteProject = useCallback(() => {
    if (!currentProject) return
    deleteProject(currentProject)
    setDeleteConfirm(false)
    const remaining = state.projects.filter((p) => p.id !== currentProject)
    if (remaining.length > 0) {
      setCurrentProject(remaining[0].id)
      history.replaceState(null, "", "?project=" + remaining[0].id)
    } else {
      setCurrentProject(null)
    }
    setFilterStatus(null)
  }, [currentProject, state.projects, deleteProject])

  const handleAddTodo = useCallback(
    async (text: string) => {
      if (!currentProject) return
      await addTodo(currentProject, text)
      setEditingId(null)
    },
    [currentProject, addTodo],
  )

  const handleDeleteTodo = useCallback((id: string) => {
    deleteTodo(id)
  }, [deleteTodo])

  const handleSaveEdit = useCallback(
    async (id: string, text: string) => {
      await renameTodo(id, text)
      setEditingId(null)
    },
    [renameTodo],
  )

  const handleToggleDone = useCallback((id: string) => {
    toggleTodoDone(id)
  }, [toggleTodoDone])

  const handleSetTodoStatus = useCallback((id: string, idx: number) => {
    setTodoStatus(id, idx)
  }, [setTodoStatus])

  const handleReorderTodo = useCallback((id: string, sortOrder: number) => {
    reorderTodo(id, sortOrder)
  }, [reorderTodo])

  const handleClearDone = useCallback(() => {
    if (!currentProject) return
    clearDone(currentProject)
    setClearDoneConfirm(false)
  }, [currentProject, clearDone])

  const headerChildren = (
    <>
      {authUser && <UserMenu user={authUser} onLogout={logout} onAdmin={() => setPage("admin")} />}
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
    </>
  )

  if (loading) {
    return (
      <>
        <Header title={<>TODO<span className="text-[var(--accent)]">.</span></>} subtitle="有序 · 专注 · 推进">
          {headerChildren}
        </Header>
        <div className="px-4 py-16 text-center">
          <p className="font-[var(--font-heading)] text-[1rem] italic text-[var(--ink-muted)]">Loading...</p>
        </div>
      </>
    )
  }

  if (page === "admin") {
    return <AdminPanel onBack={() => setPage("app")} />
  }

  return (
    <>
      <Header title={<>TODO<span className="text-[var(--accent)]">.</span></>} subtitle="有序 · 专注 · 推进">
        {headerChildren}
      </Header>

      {state.projects.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <span className="mb-4 block text-[2.5rem] opacity-30">&#x1F4CB;</span>
          <p className="mb-6 font-[var(--font-heading)] text-[1rem] italic text-[var(--ink-muted)]">
            {canManageProjects ? "还没有项目，新建一个开始管理任务吧" : "还没有项目，请联系管理员创建"}
          </p>
          {canManageProjects && (
            <button
              onClick={() => setProjectModal({ isOpen: true, mode: "add" })}
              className="cursor-pointer rounded-[var(--radius)] bg-[var(--accent)] px-5 py-[0.6rem] text-[0.875rem] font-semibold text-white transition-all duration-[0.18s] hover:bg-[var(--accent-deep)]"
            >
              + 新建项目
            </button>
          )}
        </div>
      ) : (
        <ProjectBar
          currentProject={currentProject}
          onSelectProject={selectProject}
          canManageProjects={canManageProjects}
          currentProjectRole={project?.myRole || null}
          onAddProject={() => setProjectModal({ isOpen: true, mode: "add" })}
          onEditProject={() => {
            if (currentProject) setProjectModal({ isOpen: true, mode: "rename" })
          }}
          onDeleteProject={() => {
            if (currentProject) setDeleteConfirm(true)
          }}
        />
      )}

      {project && <AddTodo project={project} onAdd={handleAddTodo} />}

      {project && project.showFilterBar !== false && (
        <FilterBar
          statuses={project.statuses}
          projectColor={project.color}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
        />
      )}

      {project && (
        <TodoList
          project={project}
          todos={visibleTodos}
          editingId={editingId}
          onStartEdit={setEditingId}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDelete={handleDeleteTodo}
          onToggleDone={handleToggleDone}
          onStatusClick={handleSetTodoStatus}
          onReorder={handleReorderTodo}
        />
      )}

      <Footer project={project} onClearDone={() => setClearDoneConfirm(true)} />

      <ProjectModal
        isOpen={projectModal.isOpen}
        mode={projectModal.mode}
        editProject={projectModal.mode === "rename" ? project : null}
        currentUserId={authUser?.id}
        readOnly={projectModal.mode === "rename" && project?.myRole !== "manage"}
        isAdmin={authUser?.role === "admin"}
        onClose={() => setProjectModal({ isOpen: false, mode: "add" })}
        onSave={projectModal.mode === "rename" ? handleUpdateProject : handleAddProject}
        onTransferComplete={reload}
      />

      <ConfirmModal
        isOpen={deleteConfirm}
        title="删除项目"
        message={
          currentProject && project
            ? `确定要删除项目「${project.name}」吗？其中的 ${todos.length} 项任务也会被删除。`
            : ""
        }
        confirmLabel="删除"
        danger
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteConfirm(false)}
      />

      <ConfirmModal
        isOpen={clearDoneConfirm}
        title="清除已完成"
        message={
          currentProject && project
            ? `确定要清除 ${project.name} 项目中已完成的所有任务吗？`
            : ""
        }
        confirmLabel="清除"
        danger
        onConfirm={handleClearDone}
        onCancel={() => setClearDoneConfirm(false)}
      />

    </>
  )
}

/* ── App root ── */

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AuthGate>
          <AppInner />
        </AuthGate>
        <FooterBanner />
      </StoreProvider>
    </AuthProvider>
  )
}
