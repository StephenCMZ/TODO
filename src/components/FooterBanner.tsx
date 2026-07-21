import { useState, useEffect } from "react"

export function FooterBanner() {
  const [html, setHtml] = useState("")

  useEffect(() => {
    fetch("/api/auth/public-settings")
      .then((r) => r.json())
      .then((s) => setHtml(s.footerHtml || ""))
      .catch(() => {})
  }, [])

  if (!html) return null

  return (
    <footer
      className="mt-auto border-t border-[var(--border-light)] px-4 py-3 text-center text-[0.6875rem] text-[var(--ink-dim)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
