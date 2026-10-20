const ACTION_KEYS = new Set(['_actions', 'actions'])

// Formats a date for export filenames.
export function dateStamp(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Removes action columns from exports.
export function exportColumns(columns) {
  // Omit action controls from exports.
  return columns.filter((col) => !ACTION_KEYS.has(col.key))
}

// Formats a row value for export.
export function formatCell(row, col) {
  const raw = col.key.split('.').reduce((obj, k) => (obj != null ? obj[k] : undefined), row)
  if (col.format) return col.format(raw, row)
  if (raw == null) return ''
  if (typeof raw === 'string') return raw
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No'
  return String(raw)
}

// Escapes a value for CSV output.
function sanitizeCsvValue(value) {
  const text = value == null ? '' : String(value)
  // Quote each value and escape embedded quotes.
  return `"${text.replace(/"/g, '""')}"`
}

// Builds CSV text from table rows.
export function buildCsv(columns, rows) {
  const cols = exportColumns(columns)
  const lines = []
  lines.push(cols.map((c) => sanitizeCsvValue(c.label)).join(','))
  rows.forEach((row) => {
    lines.push(cols.map((col) => sanitizeCsvValue(formatCell(row, col))).join(','))
  })
  return lines.join('\r\n')
}

// Starts a browser download for a generated file.
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Downloads rows as a CSV file.
export function exportCSV({ filename, columns, rows }) {
  const csv = buildCsv(columns, rows)
  // Mark the CSV as UTF-8 for spreadsheet apps.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename)
}

// Builds and downloads a PDF table.
export async function exportPDF({ filename, title, subtitle, columns, rows }) {
  // Load PDF libraries only when needed.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const cols = exportColumns(columns)
  const doc = new jsPDF({ orientation: 'landscape' })

  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 20)

  if (subtitle) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(subtitle, 14, 28)
  }

  const tableStartY = subtitle ? 36 : 30

  autoTable(doc, {
    startY: tableStartY,
    head: [cols.map((c) => c.label)],
    body: rows.map((row) => cols.map((col) => formatCell(row, col))),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
    headStyles: {
      fillColor: [40, 96, 66],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [245, 248, 246] },
    margin: { left: 14, right: 14 },
    didDrawPage: (_data) => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(130)
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, {
        align: 'right',
      })
      doc.text(`Generated ${new Date().toLocaleDateString('en-AU')}`, 14, doc.internal.pageSize.getHeight() - 8)
    },
  })

  doc.save(filename)
}
