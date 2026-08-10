// Generates a WPS (Wage Protection System) salary file for a payroll run —
// an employer detail record (EDR) followed by one salary compensation
// record (SCR) per employee, semicolon-delimited, mirroring the general
// structure banks expect for Saudi wage-protection submissions. This is a
// demonstrative export tailored to this app's own payroll data model, not
// a byte-exact certified SAMA file.
export function buildWpsFileContent({ run, org, items }) {
  const total = items.reduce((s, i) => s + i.net, 0)
  const header = ['EDR', org.wps_establishment_id, org.wps_bank_code, org.wps_employer_iban, `${run.month}/${run.year}`, items.length, total.toFixed(2), 'SAR'].join(';')
  const lines = items.map((i) => [
    'SCR', i.national_id, i.iban, i.basic.toFixed(2), i.housing_allowance.toFixed(2),
    i.other_earnings.toFixed(2), i.deductions.toFixed(2), i.net.toFixed(2), 'SAR',
  ].join(';'))
  return [header, ...lines].join('\r\n')
}

export function downloadWpsFile(data) {
  const content = buildWpsFileContent(data)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `WPS_${data.org.wps_establishment_id || 'establishment'}_${data.run.year}${String(data.run.month).padStart(2, '0')}.sif`
  a.click()
  URL.revokeObjectURL(url)
}
