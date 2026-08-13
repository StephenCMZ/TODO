export interface User {
  id: string
  username: string
  email: string
  role: string
  isActive: boolean
  created: number
  updated: number
}

export interface AuditLog {
  id: string
  userId: string | null
  username: string
  action: string
  details: string | null
  ip: string
  created: number
}
