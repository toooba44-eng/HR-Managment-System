import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { FileSignature, CheckCircle2, ClipboardList, PenLine } from 'lucide-react'
import toast from 'react-hot-toast'
import { candidateApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import Modal from '../../components/ui/Modal'
import { Field, Input, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

function FillModal({ form, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [response, setResponse] = useState('')
  const m = useMutation(() => candidateApi.submitForm(form.id, { response }), {
    onSuccess: () => { toast.success(t('تم إرسال النموذج')); qc.invalidateQueries('cand-forms'); onClose() },
    onError: () => toast.error(t('فشلت العملية')),
  })
  return (
    <Modal open onClose={onClose} title={form.title}>
      <div className="space-y-4">
        {form.description && <p className="text-sm text-slate-500">{form.description}</p>}
        <Field label={t('بياناتك / إقرارك')}><Input value={response} onChange={(e) => setResponse(e.target.value)} placeholder={t('اكتب ردك هنا')} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" required id="ack" /> {t('أقرّ بصحة البيانات المدخلة')}
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button onClick={() => m.mutate()} loading={m.isLoading}>{t('إرسال')}</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function CandidateForms() {
  const { t } = useTranslation()
  const [fill, setFill] = useState(null)
  const { data, isLoading } = useQuery('cand-forms', () => candidateApi.forms())
  if (isLoading) return <Spinner fullscreen />
  const items = data?.forms || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={ClipboardList} label={t('إجمالي النماذج')} value={s.total ?? 0} tone="blue" />
        <StatCard icon={CheckCircle2} label={t('مكتملة')} value={`${s.completed ?? 0}/${s.total ?? 0}`} tone="green" />
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={FileSignature} title={t('لا توجد نماذج مطلوبة')} /></div>
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <div key={f.id} className="card flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${f.status === 'مكتمل' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}><FileSignature className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700">{f.title}</p>
                <p className="text-xs text-slate-400">{f.description}{f.submitted_at ? ` · ${t('أُرسل {{date}}', { date: formatDate(f.submitted_at) })}` : ''}</p>
              </div>
              <Badge status={f.status}>{t(f.status)}</Badge>
              {f.status !== 'مكتمل' && (
                <button onClick={() => setFill(f)} className="text-sm px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"><PenLine className="w-4 h-4" /> {t('تعبئة')}</button>
              )}
            </div>
          ))}
        </div>
      )}

      {fill && <FillModal form={fill} onClose={() => setFill(null)} />}
    </div>
  )
}
