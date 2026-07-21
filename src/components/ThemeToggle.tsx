interface Props {
  theme: "light" | "dark"
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      title="切换主题"
      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[0.8rem] text-[var(--ink-dim)] transition-all duration-[0.18s] hover:border-[var(--ink-muted)] hover:text-[var(--ink)]"
    >
      {theme === "light" ? "☾" : "☀"}
    </button>
  )
}
