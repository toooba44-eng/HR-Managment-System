// Minimal RFC4180-ish CSV encode/decode — good enough for simple tabular
// exports/imports (quoted fields, embedded commas/quotes/newlines) without
// pulling in a dependency for it.

const BOM = String.fromCharCode(0xfeff)

export function toCSV(rows, columns) {
  const escape = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = columns.map((c) => escape(c.label)).join(',')
  const lines = rows.map((row) => columns.map((c) => escape(row[c.key])).join(','))
  return BOM + [header, ...lines].join('\r\n')
}

export function parseCSV(text) {
  const clean = text.startsWith(BOM) ? text.slice(1) : text
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\r') {
      // ignore, \n handles the line break
    } else if (ch === '\n') {
      row.push(field); field = ''
      rows.push(row); row = []
    } else {
      field += ch
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  if (rows.length === 0) return []

  const header = rows[0].map((h) => h.trim())
  return rows.slice(1)
    .filter((r) => r.some((v) => v.trim() !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] || '').trim()])))
}

export function downloadCSV(filename, rows, columns) {
  const blob = new Blob([toCSV(rows, columns)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
