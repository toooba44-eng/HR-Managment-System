import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck, AlertTriangle, Flame, Check, X, History, Inbox, UserCog, Plus, Trash2, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { approvalsApi, employeesApi } from '../api/endpoints'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import Avatar from '../components/ui/Avatar'
import StatCard from '../components/ui/StatCard'
import { Field, Input, Select, Textarea, Button } from '../components/ui/Form'
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils'

const PRIORITY_TONE = {
  مرتفعة: 'bg-rose-50 text-rose-600',
  متوسطة: 'bg-amber-50 text-amber-600',
  عادية: 'bg-slate-100 text-slate-500',
}

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'overdue', label: 'المتأخرة' },
  { key: 'priority', label: 'أولوية مرتفعة' },
  { key: 'delegated', label: 'فُوِّضت لي' },
]

function RejectModal({ item, onClose, onDone }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const m = useMutation(() => approvalsApi.decide(item.source, item.id, 'reject', reason), {
    onSuccess: () => { toast.success(t('تم الرفض')); onDone() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })
  return (
    <Modal open onClose={onClose} title={`${t('رفض')}: ${item.title}`}>
      <form onSubmit={(e) => { e.preventDefault(); if (reason.trim()) m.mutate() }} className="space-y-4">
        <Field label={t('سبب الرفض')} required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('تأكيد الرفض')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function HistoryModal({ onClose }) {
  const { t } = useTranslation()
  const { data = [], isLoading } = useQuery('approvals-history', () => approvalsApi.history())
  return (
    <Modal open onClose={onClose} title={t('سجل الموافقات')} size="lg">
      {isLoading ? <Spinner /> : data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">{t('لا توجد قرارات مسجّلة بعد.')}</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {data.map((h) => (
            <div key={h.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`badge ${h.action === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {h.action === 'approve' ? t('اعتماد') : t('رفض')}
                  </span>
                  <span className="font-medium text-slate-700">{h.title}</span>
                </div>
                <span className="text-[11px] text-slate-400">{h.source_label}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                {h.employee_name && <>{t('لـ')} {h.employee_name} · </>}
                {t('بواسطة')} {h.actor_name || t('مستخدم')} · {formatDateTime(h.created_at)}
              </p>
              {h.reason && <p className="text-xs text-slate-500 mt-1">{t('السبب')}: {h.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function NewDelegationForm({ onDone }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }))
  const [delegateId, setDelegateId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

  const m = useMutation(
    () => approvalsApi.createDelegation({ delegate_id: delegateId, start_date: startDate, end_date: endDate, notes }),
    {
      onSuccess: () => {
        toast.success(t('تم التفويض'))
        qc.invalidateQueries('approvals-delegations')
        setDelegateId(''); setStartDate(''); setEndDate(''); setNotes('')
        onDone?.()
      },
      onError: (e) => toast.error(e.response?.data?.error || t('فشل التفويض')),
    }
  )

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (delegateId && startDate && endDate) m.mutate() }} className="space-y-3 rounded-xl border border-slate-100 p-3">
      <Field label={t('فوّض إلى')} required>
        <Select value={delegateId} onChange={(e) => setDelegateId(e.target.value)} required>
          <option value="">{t('اختر موظفاً')}</option>
          {(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name} — {e.job_title}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('من تاريخ')} required><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></Field>
        <Field label={t('إلى تاريخ')} required><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required /></Field>
      </div>
      <Field label={t('ملاحظات')}><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('اختياري')} /></Field>
      <Button type="submit" loading={m.isLoading} className="w-full"><Plus className="w-4 h-4" /> {t('إضافة تفويض')}</Button>
    </form>
  )
}

function DelegationsModal({ onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const { data, isLoading } = useQuery('approvals-delegations', () => approvalsApi.delegations())
  const revoke = useMutation((id) => approvalsApi.removeDelegation(id), {
    onSuccess: () => { toast.success(t('تم إلغاء التفويض')); qc.invalidateQueries('approvals-delegations'); qc.invalidateQueries('approvals-mine') },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل الإلغاء')),
  })

  const given = data?.given || []
  const received = data?.received || []

  return (
    <Modal open onClose={onClose} title={t('التفويضات المؤقتة')} size="lg">
      {isLoading ? <Spinner /> : (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-700">{t('فوّضتها لغيري')}</h4>
              <button onClick={() => setShowForm((s) => !s)} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> {t('تفويض جديد')}
              </button>
            </div>
            {showForm && <div className="mb-3"><NewDelegationForm onDone={() => setShowForm(false)} /></div>}
            {given.length === 0 ? (
              <p className="text-xs text-slate-400">{t('لم تفوّض أحداً بعد.')}</p>
            ) : (
              <div className="space-y-2">
                {given.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-2.5 text-sm">
                    <div>
                      <p className="font-medium text-slate-700">{d.delegate_name}</p>
                      <p className="text-xs text-slate-400">{formatDate(d.start_date)} — {formatDate(d.end_date)} {d.is_active && <span className="text-emerald-600">· {t('نشط الآن')}</span>}</p>
                    </div>
                    <button onClick={() => revoke.mutate(d.id)} className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2">{t('فُوِّضت لي')}</h4>
            {received.length === 0 ? (
              <p className="text-xs text-slate-400">{t('لا يوجد تفويض لك حالياً.')}</p>
            ) : (
              <div className="space-y-2">
                {received.map((d) => (
                  <div key={d.id} className="rounded-xl border border-slate-100 p-2.5 text-sm">
                    <p className="font-medium text-slate-700">{t('نيابة عن')} {d.delegator_name}</p>
                    <p className="text-xs text-slate-400">{formatDate(d.start_date)} — {formatDate(d.end_date)} {d.is_active && <span className="text-emerald-600">· {t('نشط الآن')}</span>}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function ApprovalsInbox() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const [rejecting, setRejecting] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showDelegations, setShowDelegations] = useState(false)

  const { data, isLoading } = useQuery('approvals-mine', () => approvalsApi.mine())

  const invalidate = () => { qc.invalidateQueries('approvals-mine'); qc.invalidateQueries('approvals-history') }

  const approveMutation = useMutation((item) => approvalsApi.decide(item.source, item.id, 'approve'), {
    onSuccess: () => { toast.success(t('تم الاعتماد')); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })
  const bulkMutation = useMutation(
    (items) => approvalsApi.bulkApprove(items.map((i) => ({ source: i.source, id: i.id }))),
    {
      onSuccess: (res) => { toast.success(t('تم اعتماد {{succeeded}} من {{total}}', { succeeded: res.succeeded, total: res.results.length })); setSelected(new Set()); invalidate() },
      onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
    }
  )

  if (isLoading) return <Spinner fullscreen />

  const items = data?.items || []
  const summary = data?.summary || { total: 0, overdue: 0, highPriority: 0, delegated: 0 }
  const visible = items.filter((i) => (
    filter === 'overdue' ? i.overdue
    : filter === 'priority' ? i.priority === 'مرتفعة'
    : filter === 'delegated' ? !!i.delegated_from
    : true
  ))

  const toggle = (key) => setSelected((s) => { const next = new Set(s); next.has(key) ? next.delete(key) : next.add(key); return next })
  const selectedItems = items.filter((i) => selected.has(i.key))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Inbox} label={t('بانتظار موافقتي')} value={summary.total} tone="blue" />
        <StatCard icon={AlertTriangle} label={t('متأخرة')} value={summary.overdue} tone="rose" />
        <StatCard icon={Flame} label={t('أولوية مرتفعة')} value={summary.highPriority} tone="amber" />
        <StatCard icon={ClipboardCheck} label={t('أنواع الموافقات')} value={Object.keys(summary.bySource || {}).length} tone="violet" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${filter === f.key ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t(f.label)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {selectedItems.length > 0 && (
            <Button onClick={() => bulkMutation.mutate(selectedItems)} loading={bulkMutation.isLoading}>
              <Check className="w-4 h-4" /> {t('اعتماد المحدد ({{count}})', { count: selectedItems.length })}
            </Button>
          )}
          <button onClick={() => setShowDelegations(true)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600">
            <UserCog className="w-4 h-4" /> {t('التفويضات')}
          </button>
          <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600">
            <History className="w-4 h-4" /> {t('سجل الموافقات')}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card"><EmptyState icon={ClipboardCheck} title={t('لا توجد موافقات بانتظارك')} description={t('كل الطلبات التي تخصّك تمت معالجتها.')} /></div>
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
                      {item.delegated_from && (
                        <span className="badge bg-violet-50 text-violet-600 flex items-center gap-1"><Share2 className="w-3 h-3" /> {t('بالنيابة عن')} {item.delegated_from}</span>
                      )}
                      {item.overdue && <span className="badge bg-rose-50 text-rose-600">{t('متأخرة')}</span>}
                      <span className={`badge ${PRIORITY_TONE[item.priority]}`}>{t(item.priority)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                    <span className="badge bg-slate-100 text-slate-600">{item.source_label}</span>
                    {item.employee_name && <span>· {item.employee_name}</span>}
                    {item.employee_job_title && <span>· {item.employee_job_title}</span>}
                    <span>· {t('منذ {{count}} يوم', { count: item.days_pending })}</span>
                  </div>
                  {item.subtitle && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.subtitle}</p>}
                  {item.amount != null && <p className="text-sm font-bold text-slate-700 mt-1">{formatCurrency(item.amount)}</p>}

                  <div className="flex gap-2 mt-3">
                    <button onClick={() => approveMutation.mutate(item)} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {t('اعتماد')}
                    </button>
                    {item.can_reject && (
                      <button onClick={() => setRejecting(item)} className="text-xs px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> {t('رفض')}
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
      {showDelegations && <DelegationsModal onClose={() => setShowDelegations(false)} />}
    </div>
  )
}
