import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Grid3x3, Star, AlertTriangle, Users, CheckCircle2, History } from 'lucide-react'
import toast from 'react-hot-toast'
import { talentGridApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const LEVELS = [{ v: 1, label: 'منخفض' }, { v: 2, label: 'متوسط' }, { v: 3, label: 'عالٍ' }]
// tone by quadrant: high both = green, low both = rose, mixed = amber/blue
const cellTone = (perf, pot) => {
  const s = perf + pot
  if (perf === 3 && pot === 3) return 'bg-emerald-50 border-emerald-200'
  if (perf === 1 && pot === 1) return 'bg-rose-50 border-rose-200'
  if (s >= 5) return 'bg-blue-50 border-blue-200'
  if (s <= 3) return 'bg-amber-50 border-amber-100'
  return 'bg-slate-50 border-slate-200'
}

function HistoryModal({ emp, onClose }) {
  const { t } = useTranslation()
  const { data = [], isLoading } = useQuery(['talent-grid-history', emp.id], () => talentGridApi.history(emp.id))
  return (
    <Modal open onClose={onClose} title={t('سجل تقييم — {{name}}', { name: emp.full_name })}>
      {isLoading ? <Spinner /> : data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">{t('لا يوجد سجل تنقّل بعد.')}</p>
      ) : (
        <div className="space-y-2">
          {data.map((h) => (
            <div key={h.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-800 text-sm">{t(h.box)}</span>
                <span className="text-[11px] text-slate-400">{h.changed_by_name || t('مستخدم')} · {formatDate(h.created_at)}</span>
              </div>
              {h.notes && <p className="text-xs text-slate-500 mt-1.5">{h.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function ReviewModal({ emp, onClose, onShowHistory }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [perf, setPerf] = useState(emp.performance || 2)
  const [pot, setPot] = useState(emp.potential || 2)
  const [notes, setNotes] = useState(emp.notes || '')
  const save = useMutation(() => talentGridApi.set(emp.id, { performance: perf, potential: pot, notes }), {
    onSuccess: () => { toast.success(t('تم حفظ التقييم')); qc.invalidateQueries('talent-grid'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل')),
  })
  const clear = useMutation(() => talentGridApi.clear(emp.id), {
    onSuccess: () => { toast.success(t('تم المسح')); qc.invalidateQueries('talent-grid'); onClose() }, onError: () => toast.error(t('فشل')),
  })
  const Row = ({ label, value, onChange }) => (
    <div>
      <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>
      <div className="flex gap-2">
        {LEVELS.map((l) => (
          <button key={l.v} type="button" onClick={() => onChange(l.v)} className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${value === l.v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{t(l.label)}</button>
        ))}
      </div>
    </div>
  )
  return (
    <Modal open onClose={onClose} title={t('تقييم {{name}}', { name: emp.full_name })}>
      <div className="space-y-4">
        <Row label={t('الأداء')} value={perf} onChange={setPerf} />
        <Row label={t('الإمكانات')} value={pot} onChange={setPot} />
        <Field label={t('ملاحظات')}><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <button type="button" onClick={onShowHistory} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary-600">
          <History className="w-3.5 h-3.5" /> {t('سجل التقييم')}
        </button>
        <div className="flex justify-between gap-3 pt-2">
          {emp.performance ? <Button variant="secondary" onClick={() => clear.mutate()} className="text-rose-500">{t('إزالة')}</Button> : <span />}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
            <Button onClick={() => save.mutate()} loading={save.isLoading}>{t('حفظ')}</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function NineBox() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery('talent-grid', () => talentGridApi.get())
  const [editing, setEditing] = useState(null)
  const [viewingHistory, setViewingHistory] = useState(null)

  if (isLoading) return <Spinner fullscreen />
  const emps = data?.employees || []
  const boxes = data?.boxes || {}
  const s = data?.summary || {}
  const reviewed = emps.filter((e) => e.performance && e.potential)
  const unreviewed = emps.filter((e) => !e.performance || !e.potential)
  const inCell = (perf, pot) => reviewed.filter((e) => e.performance === perf && e.potential === pot)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label={t('مُقيَّمون')} value={`${s.reviewed ?? 0}/${s.total ?? 0}`} tone="blue" />
        <StatCard icon={Star} label={t('نجوم')} value={s.stars ?? 0} tone="green" />
        <StatCard icon={AlertTriangle} label={t('مخاطرة')} value={s.risks ?? 0} tone="rose" />
        <StatCard icon={CheckCircle2} label={t('بانتظار التقييم')} value={s.unreviewed ?? 0} tone="amber" />
      </div>

      {unreviewed.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-800 mb-3">{t('بانتظار التقييم')}</h3>
          <div className="flex flex-wrap gap-2">
            {unreviewed.map((e) => (
              <button key={e.id} onClick={() => setEditing(e)} className="flex items-center gap-2 px-2 py-1 rounded-xl border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50">
                <Avatar name={e.full_name} size="sm" /><span className="text-xs text-slate-600">{e.full_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <div className="flex items-center gap-2 mb-3"><Grid3x3 className="w-5 h-5 text-slate-400" /><h3 className="font-bold text-slate-800">{t('مصفوفة المواهب 9-Box')}</h3></div>
        <div className="flex gap-2 min-w-[640px]" dir="ltr">
          {/* Potential axis label */}
          <div className="flex items-center"><span className="text-xs font-medium text-slate-400 -rotate-90 whitespace-nowrap">{t('الإمكانات ←')}</span></div>
          <div className="flex-1">
            <div className="grid grid-rows-3 gap-2">
              {[3, 2, 1].map((pot) => (
                <div key={pot} className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((perf) => {
                    const cell = inCell(perf, pot)
                    return (
                      <div key={perf} className={`rounded-xl border p-2 min-h-[110px] ${cellTone(perf, pot)}`}>
                        <p className="text-[10px] font-bold text-slate-500 mb-1.5">{t(boxes[`${perf}-${pot}`])}</p>
                        <div className="flex flex-wrap gap-1">
                          {cell.map((e) => (
                            <button key={e.id} onClick={() => setEditing(e)} title={e.full_name} className="hover:scale-110 transition-transform">
                              <Avatar name={e.full_name} src={e.profile_picture} size="sm" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="text-center mt-2"><span className="text-xs font-medium text-slate-400">{t('الأداء →')}</span></div>
          </div>
        </div>
      </div>

      {editing && <ReviewModal emp={editing} onClose={() => setEditing(null)} onShowHistory={() => setViewingHistory(editing)} />}
      {viewingHistory && <HistoryModal emp={viewingHistory} onClose={() => setViewingHistory(null)} />}
    </div>
  )
}
