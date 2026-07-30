import { useQuery, useMutation, useQueryClient } from 'react-query'
import { FileText, UploadCloud, CheckCircle2, X, Files } from 'lucide-react'
import toast from 'react-hot-toast'
import { candidateApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { formatDate } from '../../lib/utils'

export default function CandidateDocuments() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery('cand-documents', () => candidateApi.documents())
  const upload = useMutation((id) => candidateApi.updateDocument(id, { status: 'مرفوع' }), {
    onSuccess: () => { toast.success('تم رفع المستند'); qc.invalidateQueries('cand-documents') }, onError: () => toast.error('فشل'),
  })
  const remove = useMutation((id) => candidateApi.updateDocument(id, { status: 'مطلوب' }), {
    onSuccess: () => { toast.success('تم إلغاء الرفع'); qc.invalidateQueries('cand-documents') }, onError: () => toast.error('فشل'),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.documents || []
  const s = data?.summary || {}
  const pct = s.total ? Math.round((s.uploaded / s.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={Files} label="إجمالي المستندات" value={s.total ?? 0} tone="blue" />
        <StatCard icon={CheckCircle2} label="تم رفعها" value={`${s.uploaded ?? 0}/${s.total ?? 0}`} tone="green" />
      </div>

      <div className="card">
        <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">اكتمال المستندات المطلوبة</span><span className="font-bold text-blue-600">{pct}%</span></div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={FileText} title="لا توجد مستندات مطلوبة" /></div>
      ) : (
        <div className="space-y-3">
          {items.map((doc) => (
            <div key={doc.id} className="card flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${doc.status === 'مرفوع' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><FileText className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700">{doc.title}</p>
                <p className="text-xs text-slate-400">{doc.doc_type}{doc.uploaded_at ? ` · رُفع ${formatDate(doc.uploaded_at)}` : ''}</p>
              </div>
              <Badge status={doc.status} />
              {doc.status === 'مرفوع' ? (
                <button onClick={() => remove.mutate(doc.id)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500" title="إلغاء الرفع"><X className="w-4 h-4" /></button>
              ) : (
                <button onClick={() => upload.mutate(doc.id)} className="text-sm px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"><UploadCloud className="w-4 h-4" /> رفع</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
