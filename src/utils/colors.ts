export const COLORS = [
  "#c7433a",
  "#6b8f6e",
  "#c49b5c",
  "#b5715a",
  "#5b6e7a",
  "#7b5e7b",
  "#7a8c5e",
  "#a55747",
]

export function hexToHSL(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (mx + mn) / 2
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (mx === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslStr(h: number, s: number, l: number) {
  return `hsl(${h},${s}%,${l}%)`
}

export function getStatusColors(_projectColor: string, count: number) {
  if (count === 0) return []
  return Array.from({ length: count }, (_, i) => {
    const h = (i * 137.508) % 360
    return hslStr(h, 72, 52)
  })
}
