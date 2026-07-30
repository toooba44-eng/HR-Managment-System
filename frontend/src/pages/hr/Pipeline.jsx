import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Users, UserCheck, UserX, Activity, Star, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { applicationsApi, jobsApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Select } from '../../components/ui/Form'

const STAGE_TONE = {
  'متقدم جديد': 'border-t-slate-400', 'مراجعة أولية': 'border-t-blue-400', اختبار: 'border-t-cyan-400',
  مقابلة: 'border-t-violet-400', 'عرض وظيفي': 'border-t-amber-400', 'تم التوظيف': 'border-t-emerald-500', مرفوض: 'border-t-rose-400',
}
const SOURCE_TONE = { LinkedIn: 'bg-blue-50 text-blue-600', Indeed: 'bg-indigo-50 text-indigo-600', الموقع: 'bg-slate-100 text-slate-600', 'إحالة موظف': 'bg-emerald-50 text-emerald-600' }

function Stars({ value, onRate }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={(e) => { e.stopPropagation(); onRate(n) }} className={`${n <= (value || 0) ? 'text-amber-400' : 'text-slate-200'} hover:scale-110 transition-transform`}>
          <Star className="w-3.5 h-3.5 fill-current" />
        </button>
      ))}
    </div>
  )
}

export default function Pipeline() {
  const qc = useQueryClient()
  const [jobId, setJobId] = useState('')
  const [dragId, setDragId] = useState(null)
  const [overStage, setOverStage] = useState(null)
  const { data: jobsData } = useQuery('jobs', () => jobsApi.list())
  const { data, isLoading } = useQuery(['pipeline', jobId], () => applicationsApi.pipeline(jobId ? { job_id: jobId } : {}))
  const move = useMutation(({ id, stage }) => applicationsApi.moveStage(id, stage), {
    onSuccess: () => { qc.invalidateQueries(['pipeline', jobId]) }, onError: () => toast.error('فشل النقل'),
  })
  const rate = useMutation(({ id, rating }) => applicationsApi.rate(id, rating), {
    onSuccess: () => { qc.invalidateQueries(['pipeline', jobId]) }, onError: () => toast.error('فشل'),
  })

  if (isLoading) return <Spinner fullscreen />
  const columns = data?.columns || []
  const s = data?.summary || {}
  const jobs = jobsData?.jobs || jobsData || []

  const onDrop = (stage) => {
    setOverStage(null)
    if (dragId == null) return
    const card = columns.flatMap((c) => c.cards).find((x) => x.id === dragId)
    if (card && card.stage !== stage) { move.mutate({ id: dragId, stage }); toast.success(`نُقل إلى: ${stage}`) }
    setDragId(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="إجمالي المرشحين" value={s.total ?? 0} tone="blue" />
        <StatCard icon={Activity} label="قيد المعالجة" value={s.active ?? 0} tone="violet" />
        <StatCard icon={UserCheck} label="تم التوظيف" value={s.hired ?? 0} tone="green" />
        <StatCard icon={UserX} label="مرفوض" value={s.rejected ?? 0} tone="rose" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Select value={jobId} onChange={(e) => setJobId(e.target.value)} className="max-w-[280px]">
          <option value="">كل الوظائف</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </Select>
        <p className="text-xs text-slate-400">اسحب البطاقة لنقل المرشّح بين المراحل</p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max">
          {columns.map((col) => (
            <div
              key={col.stage}
              onDragOver={(e) => { e.preventDefault(); setOverStage(col.stage) }}
              onDragLeave={() => setOverStage((s2) => (s2 === col.stage ? null : s2))}
              onDrop={() => onDrop(col.stage)}
              className={`w-64 shrink-0 rounded-2xl bg-slate-50/70 border-t-4 ${STAGE_TONE[col.stage] || 'border-t-slate-300'} ${overStage === col.stage ? 'ring-2 ring-blue-300' : ''}`}
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm font-bold text-slate-700">{col.stage}</span>
                <span className="text-xs bg-white text-slate-500 rounded-full px-2 py-0.5 border border-slate-100">{col.cards.length}</span>
              </div>
              <div className="px-2 pb-2 space-y-2 min-h-[120px]">
                {col.cards.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`bg-white rounded-xl border border-slate-100 p-3 cursor-grab active:cursor-grabbing hover:shadow-sm ${dragId === c.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                      <Avatar name={c.candidate_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{c.candidate_name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{c.job_title}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                      <Stars value={c.rating} onRate={(rating) => rate.mutate({ id: c.id, rating })} />
                      {c.source && <span className={`badge ${SOURCE_TONE[c.source] || 'bg-slate-100 text-slate-500'}`}>{c.source}</span>}
                    </div>
                  </div>
                ))}
                {col.cards.length === 0 && <p className="text-[11px] text-slate-300 text-center py-6">اسحب مرشّحاً هنا</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
