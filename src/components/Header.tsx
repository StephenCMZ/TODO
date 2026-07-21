import { type ReactNode } from "react"

interface Props {
  title: ReactNode
  subtitle: ReactNode
  children: ReactNode
}

export function Header({ title, subtitle, children }: Props) {
  return (
    <header className="mb-8 flex items-baseline gap-3">
      <div>
        <h1 className="font-heading text-[2.5rem] font-medium italic leading-none tracking-[-0.03em] text-[var(--ink)]">
          {title}
        </h1>
        <div className="mt-1 text-[0.7rem] font-medium uppercase tracking-[0.06em] text-[var(--ink-dim)]">
          {subtitle}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2 self-center">{children}</div>
    </header>
  )
}
