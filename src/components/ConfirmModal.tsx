import { ModalOverlay } from "./ModalOverlay"

interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "确定",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <ModalOverlay isOpen={isOpen}>
      <h2 className="mb-4 font-[var(--font-heading)] text-[1.25rem] font-normal italic text-[var(--ink)]">
        {title}
      </h2>
      <p className="mb-5 text-[0.875rem] leading-relaxed text-[var(--ink-dim)]">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="btn-cancel cursor-pointer rounded-[var(--radius-sm)] border-none bg-[var(--border-light)] px-5 py-[0.5rem] font-[var(--font-body)] text-[0.8125rem] font-semibold text-[var(--ink-dim)] transition-all duration-[0.12s] hover:bg-[var(--border)]"
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          className={`btn-confirm cursor-pointer rounded-[var(--radius-sm)] border-none px-5 py-[0.5rem] font-[var(--font-body)] text-[0.8125rem] font-semibold text-white transition-all duration-[0.12s] ${
            danger ? "bg-[var(--accent-deep)] hover:bg-[#8f4d18]" : "bg-[var(--accent)] hover:bg-[var(--accent-deep)]"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalOverlay>
  )
}
