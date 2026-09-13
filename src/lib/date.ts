export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatDateJP(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
