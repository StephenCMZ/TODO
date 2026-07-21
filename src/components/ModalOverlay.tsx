import type { ReactNode } from "react"

interface Props {
  isOpen: boolean
  children: ReactNode
}

export function ModalOverlay({ isOpen, children }: Props) {
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-100 flex animate-[fadeIn_0.12s_ease] items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        className="w-full max-w-[420px] animate-[modalIn_0.15s_ease_both] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-strong)]"
        style={{ maxHeight: "85vh", boxShadow: "0 12px 40px var(--shadow-strong)" }}
      >
        {children}
      </div>
    </div>
  )
}
