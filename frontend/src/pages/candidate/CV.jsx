import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { FileText, UploadCloud, CheckCircle2, Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { candidateApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import { Field, Input, Button } from '../../components/ui/Form'

function UploadModal({ current, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [name, setName] = useState(current || '')
  const m = useMutation((cv_file_name) => candidateApi.updateProfile({ cv_file_name }), {
    onSuccess: () => { toast.success(t('تم تحديث السيرة الذاتية')); qc.invalidateQueries('candidate-profile'); onClose() },
    onError: () => toast.error(t('فشلت العملية')),
  })
  return (
    <Modal open onClose={onClose} title={t('تحديث السيرة الذاتية')}>
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <UploadCloud className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500 mt-2">{t('اسحب الملف هنا أو أدخل اسمه (PDF/DOCX)')}</p>
        </div>
        <Field label={t('اسم ملف السيرة الذاتية')}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cv_name.pdf" /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button onClick={() => name && m.mutate(name)} loading={m.isLoading} disabled={!name}>{t('حفظ')}</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function CandidateCV() {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  const { data, isLoading } = useQuery('candidate-profile', () => candidateApi.getProfile())
  if (isLoading) return <Spinner fullscreen />
  const p = data?.profile || {}
  const cv = p.cv_file_name

  const filled = ['headline', 'summary', 'skills', 'education', 'phone'].filter((k) => p[k]).length
  const completeness = Math.round(((filled + (cv ? 1 : 0)) / 6) * 100)

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800">{t('اكتمال الملف')}</h3>
          <span className="text-sm font-bold text-blue-600">{completeness}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-2"><div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${completeness}%` }} /></div>
        <p className="text-xs text-slate-400 mt-2">{t('أكمل ملفك وارفع سيرتك الذاتية لزيادة فرص القبول.')}</p>
      </div>

      <div className="card">
        <h3 className="font-bold text-slate-800 mb-4">{t('السيرة الذاتية')}</h3>
        {cv ? (
          <div className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500"><FileText className="w-6 h-6" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-700 truncate">{cv}</p>
              <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {t('تم الرفع')}</p>
            </div>
            <button className="text-slate-400 hover:text-blue-600" title={t('تنزيل')}><Download className="w-5 h-5" /></button>
            <Button variant="secondary" onClick={() => setShow(true)}><RefreshCw className="w-4 h-4" /> {t('استبدال')}</Button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
            <UploadCloud className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-500 mt-3">{t('لم ترفع سيرتك الذاتية بعد')}</p>
            <div className="mt-4"><Button onClick={() => setShow(true)}><UploadCloud className="w-4 h-4" /> {t('رفع السيرة الذاتية')}</Button></div>
          </div>
        )}
      </div>

      {show && <UploadModal current={cv} onClose={() => setShow(false)} />}
    </div>
  )
}
