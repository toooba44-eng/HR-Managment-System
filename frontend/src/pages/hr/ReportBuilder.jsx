import { useState } from 'react'
import { useQuery, useMutation } from 'react-query'
import { Database, Plus, Trash2, Play, Download, Filter, Layers, Table2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { reportsApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { Input, Select, Button } from '../../components/ui/Form'

export default function ReportBuilder() {
  const { data: meta, isLoading } = useQuery('report-datasets', () => reportsApi.datasets())
  const [dataset, setDataset] = useState('employees')
  const [fields, setFields] = useState([])
  const [filters, setFilters] = useState([])
  const [groupBy, setGroupBy] = useState('')
  const [result, setResult] = useState(null)

  const datasets = meta?.datasets || []
  const operators = meta?.operators || []
  const current = datasets.find((d) => d.key === dataset)
  const dsFields = current?.fields || []

  const run = useMutation(() => reportsApi.run({ dataset, fields, filters: filters.filter((f) => f.field && f.value !== ''), group_by: groupBy || undefined }), {
    onSuccess: (r) => setResult(r),
    onError: (e) => toast.error(e.response?.data?.error || 'فشل تشغيل التقرير'),
  })

  const changeDataset = (key) => { setDataset(key); setFields([]); setFilters([]); setGroupBy(''); setResult(null) }
  const toggleField = (k) => setFields((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]))
  const addFilter = () => setFilters((f) => [...f, { field: dsFields[0]?.key || '', op: 'eq', value: '' }])
  const setFilter = (i, patch) => setFilters((f) => f.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))
  const removeFilter = (i) => setFilters((f) => f.filter((_, idx) => idx !== i))

  const exportCsv = () => {
    if (!result?.rows?.length) return
    const cols = result.columns
    const header = cols.map((c) => `"${c.label}"`).join(',')
    const lines = result.rows.map((r) => cols.map((c) => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = '﻿' + [header, ...lines].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `report_${dataset}_${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <Spinner fullscreen />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Builder panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Database className="w-5 h-5 text-slate-400" /> مصدر البيانات</h3>
            <Select value={dataset} onChange={(e) => changeDataset(e.target.value)}>
              {datasets.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </Select>
          </div>

          <div className="card">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Table2 className="w-5 h-5 text-slate-400" /> الحقول</h3>
            <div className="space-y-1.5">
              {dsFields.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={fields.includes(f.key)} onChange={() => toggleField(f.key)} className="rounded" disabled={!!groupBy} />
                  {f.label}
                </label>
              ))}
            </div>
            {fields.length === 0 && !groupBy && <p className="text-[11px] text-slate-400 mt-2">لم تُحدَّد حقول — ستظهر جميع الحقول.</p>}
          </div>

          <div className="card">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Layers className="w-5 h-5 text-slate-400" /> التجميع</h3>
            <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              <option value="">بدون تجميع (جدول تفصيلي)</option>
              {dsFields.map((f) => <option key={f.key} value={f.key}>حسب {f.label}</option>)}
            </Select>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Filter className="w-5 h-5 text-slate-400" /> عوامل التصفية</h3>
              <button onClick={addFilter} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> إضافة</button>
            </div>
            <div className="space-y-2">
              {filters.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Select value={f.field} onChange={(e) => setFilter(i, { field: e.target.value })} className="!py-1.5 text-xs flex-1">
                    {dsFields.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                  </Select>
                  <Select value={f.op} onChange={(e) => setFilter(i, { op: e.target.value })} className="!py-1.5 text-xs w-20">
                    {operators.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </Select>
                  <Input value={f.value} onChange={(e) => setFilter(i, { value: e.target.value })} className="!py-1.5 text-xs w-24" placeholder="قيمة" />
                  <button onClick={() => removeFilter(i)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {filters.length === 0 && <p className="text-[11px] text-slate-400">لا توجد عوامل تصفية.</p>}
            </div>
          </div>

          <Button onClick={() => run.mutate()} loading={run.isLoading} className="w-full"><Play className="w-5 h-5" /> تشغيل التقرير</Button>
        </div>

        {/* Result panel */}
        <div className="lg:col-span-2">
          <div className="card min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">النتيجة {result ? `(${result.total})` : ''}</h3>
              {result?.rows?.length > 0 && <Button variant="secondary" onClick={exportCsv}><Download className="w-4 h-4" /> تصدير CSV</Button>}
            </div>
            {!result ? (
              <EmptyState icon={Play} title="شغّل التقرير لعرض النتائج" description="اختر مصدر البيانات والحقول ثم اضغط تشغيل" />
            ) : result.rows.length === 0 ? (
              <EmptyState icon={Database} title="لا توجد نتائج مطابقة" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right text-slate-400 border-b border-slate-100">
                      {result.columns.map((c) => <th key={c.key} className="pb-3 font-medium whitespace-nowrap">{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {result.rows.map((r, i) => (
                      <tr key={i}>
                        {result.columns.map((c) => <td key={c.key} className="py-2.5 text-slate-600 whitespace-nowrap">{r[c.key] ?? '—'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
