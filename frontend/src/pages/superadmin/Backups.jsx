import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Database, DatabaseBackup, RotateCcw, Trash2, Plus, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

export default function Backups() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery('platform-backups', () => platformApi.backups())
  const create = useMutation(() => platformApi.createBackup(), {
    onSuccess: () => { toast.success(t('تم إنشاء نسخة احتياطية')); qc.invalidateQueries('platform-backups') }, onError: () => toast.error(t('فشل')),
  })
  const restore = useMutation((id) => platformApi.restoreBackup(id), {
    onSuccess: () => { toast.success(t('تمت الاستعادة')); qc.invalidateQueries('platform-backups') }, onError: (e) => toast.error(e.response?.data?.error || t('فشل')),
  })
  const del = useMutation((id) => platformApi.removeBackup(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('platform-backups') }, onError: () => toast.error(t('فشل')),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.backups || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={DatabaseBackup} label={t('عدد النسخ')} value={s.total ?? 0} tone="blue" />
        <StatCard icon={Clock} label={t('آخر نسخة')} value={s.last_at ? formatDate(s.last_at) : '—'} tone="green" />
      </div>

      <div className="flex justify-end"><Button onClick={() => create.mutate()} loading={create.isLoading}><Plus className="w-5 h-5" /> {t('إنشاء نسخة احتياطية')}</Button></div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={Database} title={t('لا توجد نسخ احتياطية')} /></div>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <div key={b.id} className="card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><Database className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-700">{t('نسخة #{{id}}', { id: b.id })}</p>
                  <span className="badge bg-slate-100 text-slate-600">{t(b.type)}</span>
                </div>
                <p className="text-xs text-slate-400">{b.note} · {b.size_mb} MB · {formatDate(b.created_at)}</p>
              </div>
              <Badge status={b.status}>{t(b.status)}</Badge>
              {b.status === 'مكتمل' && (
                <button onClick={() => window.confirm(t('استعادة هذه النسخة؟')) && restore.mutate(b.id)} className="text-sm px-3 py-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center gap-1"><RotateCcw className="w-4 h-4" /> {t('استعادة')}</button>
              )}
              <button onClick={() => window.confirm(t('حذف النسخة؟')) && del.mutate(b.id)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
