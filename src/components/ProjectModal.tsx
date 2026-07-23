import { useState, useEffect, useRef } from "react"
import type { Project, ProjectSettings, ProjectMember } from "../types"
import { COLORS } from "../utils/colors"
import { ModalOverlay } from "./ModalOverlay"

interface Props {
  isOpen: boolean
  mode: "add" | "rename"
  editProject: Project | null
  currentUserId?: string
  readOnly?: boolean
  isAdmin?: boolean
  onClose: () => void
  onSave: (name: string, color: string, statuses: string[], settings: ProjectSettings) => void | Promise<void>
  onTransferComplete?: () => void
}

const DEFAULT_STATUSES = ["待开始", "进行中", "审核中", "已完成"]

const MEMBER_ROLE_OPTIONS = [
  { value: "manage", label: "管理" },
  { value: "edit", label: "编辑" },
  { value: "view", label: "查看" },
]

export function ProjectModal({ isOpen, mode, editProject, currentUserId, readOnly, isAdmin, onClose, onSave, onTransferComplete }: Props) {
  const [name, setName] = useState("")
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [statuses, setStatuses] = useState<string[]>([])
  const [showDone, setShowDone] = useState(true)
  const [showTime, setShowTime] = useState(true)
  const [showFilterBar, setShowFilterBar] = useState(true)
  const [autoSortDone, setAutoSortDone] = useState(true)
  const [showIndex, setShowIndex] = useState(true)
  const [autoCompleteParent, setAutoCompleteParent] = useState(false)
  const [statusEditorEnabled, setStatusEditorEnabled] = useState(false)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [availableUsers, setAvailableUsers] = useState<{ id: string; username: string }[]>([])
  const [showMemberPicker, setShowMemberPicker] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [newMemberRole, setNewMemberRole] = useState("edit")
  const [memberMessage, setMemberMessage] = useState("")
  const [membersLoaded, setMembersLoaded] = useState(false)
  const [showOwnerPicker, setShowOwnerPicker] = useState(false)
  const [newOwnerId, setNewOwnerId] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function authHeaders(): Record<string, string> {
    const token = localStorage.getItem("todo_token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  useEffect(() => {
    if (!isOpen) return
    if (mode === "rename" && editProject) {
      setName(editProject.name)
      setSelectedColor(editProject.color)
      setStatuses([...editProject.statuses])
      setStatusEditorEnabled(editProject.statuses.length > 0)
      setShowDone(editProject.showDone)
      setShowTime(editProject.showTime)
      setShowFilterBar(editProject.showFilterBar)
      setAutoSortDone(editProject.autoSortDone)
      setShowIndex(editProject.showIndex)
      setAutoCompleteParent(editProject.autoCompleteParent)
    } else {
      setName("")
      setSelectedColor(COLORS[0])
      setStatuses([])
      setStatusEditorEnabled(false)
      setShowDone(true)
      setShowTime(true)
      setShowFilterBar(true)
      setAutoSortDone(true)
      setShowIndex(true)
      setAutoCompleteParent(true)
    }
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen, mode, editProject])

  // Fetch members when modal opens in rename mode
  useEffect(() => {
    if (!isOpen || mode !== "rename" || !editProject) return
    fetchMembers()
    setMembersLoaded(true)
  }, [isOpen, mode, editProject])

  async function fetchMembers() {
    if (!editProject) return
    setMemberMessage("")
    try {
      const res = await fetch(`/api/projects/${editProject.id}/members`, { headers: authHeaders() })
      if (res.ok) {
        setMembers(await res.json())
      } else if (res.status === 403) {
        // User doesn't have manage permission — hide member section
        setMembers([])
      } else {
        setMemberMessage("加载成员失败")
      }
    } catch {
      setMemberMessage("加载成员失败")
    }
  }

  async function fetchAvailableUsers(forOwnerTransfer?: boolean) {
    setMemberMessage("")
    try {
      const res = await fetch("/api/users", { headers: authHeaders() })
      if (res.ok) {
        const all = await res.json()
        if (forOwnerTransfer) {
          setAvailableUsers(all.filter((u: any) => u.id !== editProject?.userId))
        } else {
          const memberIds = new Set(members.map((m) => m.userId))
          if (editProject) memberIds.add(editProject.userId!)
          setAvailableUsers(all.filter((u: any) => !memberIds.has(u.id)))
        }
        setSelectedUserId("")
        setNewMemberRole("edit")
      }
    } catch {
      setMemberMessage("加载用户列表失败")
    }
  }

  async function handleAddMember() {
    if (!selectedUserId || !editProject) return
    setMemberMessage("")
    try {
      const res = await fetch(`/api/projects/${editProject.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ userId: selectedUserId, role: newMemberRole }),
      })
      if (res.ok) {
        await fetchMembers()
        setShowMemberPicker(false)
        setAvailableUsers([])
      } else {
        const data = await res.json()
        setMemberMessage(data.error || "添加失败")
      }
    } catch {
      setMemberMessage("添加失败")
    }
  }

  async function handleUpdateMemberRole(userId: string, role: string) {
    if (!editProject) return
    setMemberMessage("")
    try {
      const res = await fetch(`/api/projects/${editProject.id}/members/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role } as ProjectMember : m)))
      } else {
        setMemberMessage("更新角色失败")
      }
    } catch {
      setMemberMessage("更新角色失败")
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!editProject) return
    setMemberMessage("")
    try {
      const res = await fetch(`/api/projects/${editProject.id}/members/${userId}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.userId !== userId))
      } else {
        setMemberMessage("移除成员失败")
      }
    } catch {
      setMemberMessage("移除成员失败")
    }
  }

  async function handleTransferOwnership() {
    if (!newOwnerId || !editProject) return
    setMemberMessage("")
    try {
      const res = await fetch(`/api/projects/${editProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: editProject.name,
          color: editProject.color,
          statuses: editProject.statuses,
          ownerId: newOwnerId,
          showDone: editProject.showDone,
          showTime: editProject.showTime,
          showFilterBar: editProject.showFilterBar,
          autoSortDone: editProject.autoSortDone,
          showIndex: editProject.showIndex,
        }),
      })
      if (res.ok) {
        setShowOwnerPicker(false)
        setNewOwnerId("")
        setMemberMessage("拥有者已转移")
        await fetchMembers()
        onTransferComplete?.()
      } else {
        const data = await res.json()
        setMemberMessage(data.error || "转移失败")
      }
    } catch {
      setMemberMessage("转移失败")
    }
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    const finalStatuses = statusEditorEnabled ? statuses.filter((s) => s.trim()) : []
    await onSave(trimmed, selectedColor, finalStatuses, {
      showDone,
      showTime,
      showFilterBar,
      autoSortDone,
      showIndex,
      autoCompleteParent,
    })
    onClose()
  }

  function updateStatus(i: number, value: string) {
    setStatuses((prev) => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  function removeStatus(i: number) {
    setStatuses((prev) => {
      if (prev.length <= 2) return prev
      return prev.filter((_, idx) => idx !== i)
    })
  }

  function addStatus() {
    setStatuses((prev) => [...prev, "新状态"])
  }

  function moveStatus(from: number, to: number) {
    setStatuses((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  return (
    <ModalOverlay isOpen={isOpen}>
      <h2 className="mb-4 font-[var(--font-heading)] text-[1.25rem] font-normal italic text-[var(--ink)]">
        {mode === "rename" ? "编辑项目" : "新建项目"}
      </h2>

      <label className="mb-[0.35rem] block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--ink-dim)]">
        项目名称
      </label>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave()
          if (e.key === "Escape") onClose()
        }}
        placeholder="项目名称"
        maxLength={30}
        disabled={readOnly}
        className="mb-3 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-[0.85rem] py-[0.55rem] font-[var(--font-body)] text-[0.875rem] text-[var(--ink)] outline-none transition-[border-color] duration-[0.12s] focus:border-[var(--accent)] focus:shadow-[0_0_0_2px_rgba(201,112,46,0.1)] disabled:cursor-not-allowed disabled:opacity-60"
      />

      <label className="mb-[0.35rem] block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--ink-dim)]">
        主题色
      </label>
      <div className="mb-4 flex flex-wrap gap-[0.4rem]">
        {COLORS.map((c) => (
          <div
            key={c}
            onClick={() => !readOnly && setSelectedColor(c)}
            className={`h-6 w-6 rounded-full border-2 transition-all duration-[0.12s] ${
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"
            } ${c === selectedColor ? "border-[var(--ink)] scale-110" : "border-transparent"}`}
            style={{ background: c }}
          />
        ))}
      </div>

      {/* Status Editor */}
      <div className="mb-1">
        <label className="mb-[0.35rem] block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--ink-dim)]">
          状态节点
        </label>
        <div className="status-editor">
          {statusEditorEnabled ? (
            readOnly ? (
              <div className="space-y-1">
                {statuses.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded bg-[var(--border-light)] px-3 py-1.5 text-[0.8125rem] text-[var(--ink)]"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[0.6rem] font-semibold text-white">
                      {i + 1}
                    </span>
                    {s}
                  </div>
                ))}
              </div>
            ) : (
            <>
              <div>
                {statuses.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-[0.4rem] border-b border-[var(--border-light)] py-[0.35rem] transition-all duration-[0.1s] last:border-none"
                    draggable
                    onDragStart={(e) => {
                      e.currentTarget.classList.add("opacity-25")
                      e.dataTransfer.effectAllowed = "move"
                      e.dataTransfer.setData("text/plain", String(i))
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.classList.remove("opacity-25")
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = "move"
                      if (!e.currentTarget.classList.contains("opacity-25")) {
                        e.currentTarget.style.borderBottomColor = "var(--accent)"
                        e.currentTarget.style.borderBottomWidth = "2px"
                      }
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderBottomColor = ""
                      e.currentTarget.style.borderBottomWidth = ""
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.style.borderBottomColor = ""
                      e.currentTarget.style.borderBottomWidth = ""
                      const fromIdx = parseInt(e.dataTransfer.getData("text/plain"))
                      if (isNaN(fromIdx) || fromIdx === i) return
                      moveStatus(fromIdx, i)
                    }}
                  >
                    <span className="cursor-grab select-none px-[2px] text-[0.875rem] text-[var(--ink-muted)] active:cursor-grabbing">
                      &#x2630;
                    </span>
                    <input
                      value={s}
                      onChange={(e) => updateStatus(i, e.target.value)}
                      maxLength={20}
                      placeholder="状态名称"
                      className="flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] px-[0.55rem] py-[0.35rem] text-[0.8125rem] text-[var(--ink)] outline-none focus:border-[var(--accent)]!"
                    />
                    {statuses.length > 2 && (
                      <button onClick={() => removeStatus(i)} className="rm-status">
                        &#10005;
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={addStatus}
                  className="inline-flex cursor-pointer items-center gap-[0.3rem] rounded-[6px] border border-dashed border-[var(--border)] bg-transparent px-[0.7rem] py-[0.35rem] font-[var(--font-body)] text-[0.6875rem] font-medium text-[var(--ink-dim)] transition-all duration-[0.12s] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  + 添加状态
                </button>
                <button
                  onClick={() => setStatusEditorEnabled(false)}
                  className="cursor-pointer border-none bg-transparent px-[0.5rem] py-[0.25rem] font-[var(--font-body)] text-[0.6875rem] text-[var(--ink-muted)] underline decoration-[var(--border)] underline-offset-3 transition-colors duration-[0.12s] hover:text-[var(--accent)] hover:decoration-[var(--accent-light)]"
                >
                  回到简单勾选模式
                </button>
              </div>
            </>
          )) : (
            <>
              <div className="flex items-center gap-[0.4rem] rounded-[var(--radius-sm)] bg-[var(--border-light)] px-[0.65rem] py-[0.5rem] text-[0.75rem] text-[var(--ink-dim)]">
                <span className="text-[0.875rem]">&#x2714;</span> 未启用多节点状态，任务以简单勾选形式展示
              </div>
              {!readOnly && (
                <button
                  onClick={() => {
                    setStatuses([...DEFAULT_STATUSES])
                    setStatusEditorEnabled(true)
                  }}
                  className="mt-2 inline-flex cursor-pointer items-center gap-[0.3rem] rounded-[6px] border border-dashed border-[var(--border)] bg-transparent px-[0.7rem] py-[0.35rem] font-[var(--font-body)] text-[0.6875rem] font-medium text-[var(--ink-dim)] transition-all duration-[0.12s] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  + 启用多节点状态
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Project Settings */}
      <div className="mt-4 flex flex-col gap-2 border-t border-[var(--divider)] pt-[0.85rem]">
        <label className="mb-0 block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--ink-dim)]">
          项目设置
        </label>
        <ToggleRow checked={showDone} onChange={setShowDone} disabled={readOnly}>
          显示已完成
        </ToggleRow>
        <ToggleRow checked={showTime} onChange={setShowTime} disabled={readOnly}>
          显示创建时间
        </ToggleRow>
        <ToggleRow checked={showFilterBar} onChange={setShowFilterBar} disabled={readOnly}>
          显示筛选栏
        </ToggleRow>
        <ToggleRow checked={showIndex} onChange={setShowIndex} disabled={readOnly}>
          显示序号
        </ToggleRow>
        <ToggleRow checked={autoCompleteParent} onChange={setAutoCompleteParent} disabled={readOnly}>
          自动完成父任务
        </ToggleRow>
        <ToggleRow checked={autoSortDone} onChange={setAutoSortDone} disabled={readOnly}>
          已完成移到底部
        </ToggleRow>
      </div>

      {/* Member Management — rename mode only */}
      {mode === "rename" && membersLoaded && (
        <div className="mt-4 border-t border-[var(--divider)] pt-[0.85rem]">
          <label className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--ink-dim)]">
            成员管理
          </label>

          {memberMessage && (
            <p className="mb-2 rounded bg-blue-50 p-1.5 text-center text-[0.6875rem] text-blue-600">{memberMessage}</p>
          )}

          {/* Project owner */}
          {editProject?.ownerName && (
            <div className="mb-2 space-y-1">
              <div className="flex items-center gap-2 rounded bg-[var(--border-light)] px-3 py-2 opacity-70">
                <span className="flex-1 text-[0.8125rem] text-[var(--ink)]">
                  {editProject.ownerName}
                  {editProject.userId === currentUserId && (
                    <span className="ml-1 text-[0.6875rem] text-[var(--ink-muted)]">(你)</span>
                  )}
                  <span className="ml-1.5 rounded bg-[var(--accent)] px-1.5 py-[1px] text-[0.5625rem] font-semibold text-white">拥有者</span>
                </span>
                {isAdmin && !readOnly && !showOwnerPicker && (
                  <button
                    onClick={() => { setShowOwnerPicker(true); fetchAvailableUsers(true) }}
                    className="cursor-pointer rounded px-1.5 py-[1px] text-[0.6875rem] text-[var(--ink-muted)] hover:text-[var(--accent)]"
                  >
                    转移
                  </button>
                )}
              </div>
              {showOwnerPicker && (
                <div className="flex items-center gap-2 rounded bg-[var(--surface)] px-3 py-2">
                  <select
                    value={newOwnerId}
                    onChange={(e) => setNewOwnerId(e.target.value)}
                    className="flex-1 cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-[3px] text-[0.75rem] text-[var(--ink)] outline-none"
                  >
                    <option value="">选择新拥有者...</option>
                    {availableUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                      ))}
                  </select>
                  <button
                    onClick={handleTransferOwnership}
                    disabled={!newOwnerId}
                    className="cursor-pointer rounded bg-[var(--accent)] px-3 py-[3px] text-[0.6875rem] text-white transition-all hover:bg-[var(--accent-deep)] disabled:opacity-40"
                  >
                    确认转移
                  </button>
                  <button
                    onClick={() => { setShowOwnerPicker(false); setNewOwnerId(""); setAvailableUsers([]) }}
                    className="cursor-pointer rounded px-2 py-[3px] text-[0.6875rem] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          )}

          {members.length > 0 && (
            <div className="mb-2 space-y-1">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-2 rounded bg-[var(--border-light)] px-3 py-2">
                  <span className="flex-1 text-[0.8125rem] text-[var(--ink)]">
                    {m.username}
                    {m.userId === currentUserId && (
                      <span className="ml-1 text-[0.6875rem] text-[var(--ink-muted)]">(你)</span>
                    )}
                  </span>
                  <span className="mr-1 text-[0.6875rem] text-[var(--ink-muted)]">{m.email}</span>
                  {readOnly ? (
                    <span className="rounded bg-[var(--border)] px-2 py-[1px] text-[0.625rem] font-medium text-[var(--ink-muted)]">
                      {MEMBER_ROLE_OPTIONS.find((o) => o.value === m.role)?.label || m.role}
                    </span>
                  ) : (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) => handleUpdateMemberRole(m.userId, e.target.value)}
                        disabled={m.userId === currentUserId && !isAdmin}
                        className="cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-[1px] text-[0.6875rem] text-[var(--ink)] outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {MEMBER_ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {(m.userId !== currentUserId || isAdmin) && (
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          className="cursor-pointer rounded px-1.5 py-[1px] text-[0.6875rem] text-red-500 hover:bg-red-50"
                        >
                          移除
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {!readOnly && (showMemberPicker ? (
            <div className="flex items-center gap-2 rounded bg-[var(--surface)] px-3 py-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-[3px] text-[0.75rem] text-[var(--ink)] outline-none"
              >
                <option value="">选择用户...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-[3px] text-[0.6875rem] text-[var(--ink)] outline-none"
              >
                {MEMBER_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!selectedUserId}
                className="cursor-pointer rounded bg-[var(--accent)] px-3 py-[3px] text-[0.6875rem] text-white transition-all hover:bg-[var(--accent-deep)] disabled:opacity-40"
              >
                添加
              </button>
              <button
                onClick={() => { setShowMemberPicker(false); setAvailableUsers([]) }}
                className="cursor-pointer rounded px-2 py-[3px] text-[0.6875rem] text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowMemberPicker(true); fetchAvailableUsers() }}
              className="inline-flex cursor-pointer items-center gap-[0.3rem] rounded-[6px] border border-dashed border-[var(--border)] bg-transparent px-[0.7rem] py-[0.35rem] text-[0.6875rem] font-medium text-[var(--ink-dim)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              + 添加成员
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        {readOnly ? (
          <button
            onClick={onClose}
            className="cursor-pointer rounded-[var(--radius-sm)] border-none bg-[var(--accent)] px-5 py-[0.5rem] font-[var(--font-body)] text-[0.8125rem] font-semibold text-white transition-all duration-[0.12s] hover:bg-[var(--accent-deep)]"
          >
            关闭
          </button>
        ) : (
          <>
            <button
              onClick={onClose}
              className="btn-cancel cursor-pointer rounded-[var(--radius-sm)] border-none bg-[var(--border-light)] px-5 py-[0.5rem] font-[var(--font-body)] text-[0.8125rem] font-semibold text-[var(--ink-dim)] transition-all duration-[0.12s] hover:bg-[var(--border)]"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="btn-confirm cursor-pointer rounded-[var(--radius-sm)] border-none bg-[var(--accent)] px-5 py-[0.5rem] font-[var(--font-body)] text-[0.8125rem] font-semibold text-white transition-all duration-[0.12s] hover:bg-[var(--accent-deep)]"
            >
              确定
            </button>
          </>
        )}
      </div>
    </ModalOverlay>
  )
}

function ToggleRow({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 py-[0.15rem] text-[0.8125rem] ${
        disabled ? "text-[var(--ink-muted)]" : "text-[var(--ink-dim)] hover:text-[var(--ink)]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-[0.9rem] w-[0.9rem] shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        style={{ accentColor: "var(--accent)" }}
      />
      {children}
    </label>
  )
}
