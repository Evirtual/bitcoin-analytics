export function connectorInitials(name: string): string {
  const cleaned = name
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
  if (!cleaned) return 'W'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]!.slice(0, 1) + parts[1]!.slice(0, 1)).toUpperCase()
}
