export function classify(error: string) {
  const e = error.toLowerCase()

  if (e.includes('syntax')) return 'SYNTAX'
  if (e.includes('type')) return 'TYPE'
  if (e.includes('lint')) return 'LINT'
  if (e.includes('build')) return 'BUILD'

  return 'UNKNOWN'
}
