export interface Project {
  id: string
  userId?: string
  ownerName?: string
  name: string
  color: string
  statuses: string[]
  created: number
  showDone: boolean
  showTime: boolean
  showFilterBar: boolean
  autoSortDone: boolean
  showIndex: boolean
  autoCompleteParent: boolean
  autoExpandSubtasks: boolean
  myRole?: "manage" | "edit" | "view"
}

export interface ProjectMember {
  userId: string
  username: string
  email: string
  role: "manage" | "edit" | "view"
}

export interface Todo {
  id: string
  projectId: string
  text: string
  statusIndex: number
  created: number
  sortOrder: number
  statuses?: string[]
  parentId?: string
}

export interface AppData {
  projects: Project[]
  todos: Todo[]
  defaultProjectId: string
}

export interface ProjectSettings {
  showDone: boolean
  showTime: boolean
  showFilterBar: boolean
  autoSortDone: boolean
  showIndex: boolean
  autoCompleteParent: boolean
  autoExpandSubtasks: boolean
}
