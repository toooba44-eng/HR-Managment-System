import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ClipboardCheck, AlertTriangle, Flame, Check, X, History, Inbox } from 'lucide-react'
import toast from 'react-hot-toast'
import { approvalsApi } from '../api/endpoints'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import Avatar from '../components/ui/Avatar'
import StatCard from '../components/ui/StatCard'
import { Field, Textarea, Button } from '../components/ui/Form'
import { formatCurrency, formatDateTime } from '../lib/utils'

const PRIORITY_TONE = {
  مرتفعة: 'bg-rose-50 text-rose-600',
  متوسطة: 'bg-amber-50 text-amber-600',
  عادية: 'bg-slate-100 text-slate-500',
}

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'overdue', label: 'المتأخرة' },
  { key: 'priority', label: 'أولوية مرتفعة' },
]

function RejectModal({ item, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const m = useMutation(() => approvalsApi.decide(item.source, item.id, 'reject', reason), {
    onSuccess: () => { toast.success('تم الرفض'); onDone() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  return (
    <Modal open onClose={onClose} title={`رفض: ${item.title}`}>
      <form onSubmit={(e) => { e.preventDefault(); if (reason.trim()) m.mutate() }} className="space-y-4">
        <Field label="سبب الرفض" required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>تأكيد الرفض</Button>
        </div>
      </form>
    </Modal>
  )
}

function HistoryModal({ onClose }) {
  const { data = [], isLoading } = useQuery('approvals-history', () => approvalsApi.history())
  return (
    <Modal open onClose={onClose} title="سجل الموافقات" size="lg">
      {isLoading ? <Spinner /> : data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">لا توجد قرارات مسجّلة بعد.</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {data.map((h) => (
            <div key={h.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`badge ${h.action === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {h.action === 'approve' ? 'اعتماد' : 'رفض'}
                  </span>
                  <span className="font-medium text-slate-700">{h.title}</span>
                </div>
                <span className="text-[11px] text-slate-400">{h.source_label}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                {h.employee_name && <>لـ {h.employee_name} · </>}
                بواسطة {h.actor_name || 'مستخدم'} · {formatDateTime(h.created_at)}
              </p>
              {h.reason && <p className="text-xs text-slate-500 mt-1">السبب: {h.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

export default function ApprovalsInbox() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const [rejecting, setRejecting] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const { data, isLoading } = useQuery('approvals-mine', () => approvalsApi.mine())

  const invalidate = () => { qc.invalidateQueries('approvals-mine'); qc.invalidateQueries('approvals-history') }

  const approveMutation = useMutation((item) => approvalsApi.decide(item.source, item.id, 'approve'), {
    onSuccess: () => { toast.success('تم الاعتماد'); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const bulkMutation = useMutation(
    (items) => approvalsApi.bulkApprove(items.map((i) => ({ source: i.source, id: i.id }))),
    {
      onSuccess: (res) => { toast.success(`تم اعتماد ${res.succeeded} من ${res.results.length}`); setSelected(new Set()); invalidate() },
      onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
    }
  )

  if (isLoading) return <Spinner fullscreen />

  const items = data?.items || []
  const summary = data?.summary || { total: 0, overdue: 0, highPriority: 0 }
  const visible = items.filter((i) => (filter === 'overdue' ? i.overdue : filter === 'priority' ? i.priority === 'مرتفعة' : true))

  const toggle = (key) => setSelected((s) => { const next = new Set(s); next.has(key) ? next.delete(key) : next.add(key); return next })
  const selectedItems = items.filter((i) => selected.has(i.key))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Inbox} label="بانتظار موافقتي" value={summary.total} tone="blue" />
        <StatCard icon={AlertTriangle} label="متأخرة" value={summary.overdue} tone="rose" />
        <StatCard icon={Flame} label="أولوية مرتفعة" value={summary.highPriority} tone="amber" />
        <StatCard icon={ClipboardCheck} label="أنواع الموافقات" value={Object.keys(summary.bySource || {}).length} tone="violet" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${filter === f.key ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {selectedItems.length > 0 && (
            <Button onClick={() => bulkMutation.mutate(selectedItems)} loading={bulkMutation.isLoading}>
              <Check className="w-4 h-4" /> اعتماد المحدد ({selectedItems.length})
            </Button>
          )}
          <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600">
            <History className="w-4 h-4" /> سجل الموافقات
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card"><EmptyState icon={ClipboardCheck} title="لا توجد موافقات بانتظارك" description="كل الطلبات التي تخصّك تمت معالجتها." /></div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <div key={item.key} className="card">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(item.key)}
                  onChange={() => toggle(item.key)}
                  className="w-4 h-4 mt-1.5 rounded"
                />
                {item.employee_name && <Avatar name={item.employee_name} src={item.employee_picture} size="md" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-800">{item.title}</h3>
                    <div className="flex items-center gap-1.5">
                      {item.overdue && <span className="badge bg-rose-50 text-rose-600">متأخرة</span>}
                      <span className={`badge ${PRIORITY_TONE[item.priority]}`}>{item.priority}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                    <span className="badge bg-slate-100 text-slate-600">{item.source_label}</span>
                    {item.employee_name && <span>· {item.employee_name}</span>}
                    {item.employee_job_title && <span>· {item.employee_job_title}</span>}
                    <span>· منذ {item.days_pending} يوم</span>
                  </div>
                  {item.subtitle && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.subtitle}</p>}
                  {item.amount != null && <p className="text-sm font-bold text-slate-700 mt-1">{formatCurrency(item.amount)}</p>}

                  <div className="flex gap-2 mt-3">
                    <button onClick={() => approveMutation.mutate(item)} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> اعتماد
                    </button>
                    {item.can_reject && (
                      <button onClick={() => setRejecting(item)} className="text-xs px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> رفض
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejecting && <RejectModal item={rejecting} onClose={() => setRejecting(null)} onDone={() => { setRejecting(null); invalidate() }} />}
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  )
}
