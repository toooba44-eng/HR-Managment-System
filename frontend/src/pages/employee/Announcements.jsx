import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Megaphone, Plus, Pin, Trash2, CheckCircle2, Users, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { announcementsApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Textarea, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const CAN_POST = ['super_admin', 'admin', 'hr_manager']

function AnnouncementForm({ open, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ title: '', body: '', is_pinned: false, requires_acknowledgment: false })

  const mutation = useMutation((data) => announcementsApi.create(data), {
    onSuccess: () => {
      toast.success('تم نشر الإعلان')
      qc.invalidateQueries('announcements')
      onClose()
      setForm({ title: '', body: '', is_pinned: false, requires_acknowledgment: false })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل النشر'),
  })

  return (
    <Modal open={open} onClose={onClose} title="إعلان جديد">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        <Field label="العنوان" required>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        </Field>
        <Field label="النص" required>
          <Textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={4} required />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm((f) => ({ ...f, is_pinned: e.target.checked }))} className="w-4 h-4 rounded" />
          تثبيت الإعلان في الأعلى
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={form.requires_acknowledgment} onChange={(e) => setForm((f) => ({ ...f, requires_acknowledgment: e.target.checked }))} className="w-4 h-4 rounded" />
          يتطلب إقرار الموظفين بالاطلاع
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>نشر</Button>
        </div>
      </form>
    </Modal>
  )
}

function ReadsModal({ announcement, onClose }) {
  const { data, isLoading } = useQuery(['announcement-reads', announcement.id], () => announcementsApi.reads(announcement.id))
  return (
    <Modal open onClose={onClose} title={`من اطّلع على: ${announcement.title}`}>
      {isLoading ? <Spinner /> : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            اطّلع <span className="font-bold text-emerald-600">{data.readers.length}</span> من أصل <span className="font-bold text-slate-700">{data.total}</span> موظف نشط.
          </p>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">اطّلعوا ({data.readers.length})</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {data.readers.length === 0 && <p className="text-xs text-slate-400">لا أحد بعد.</p>}
              {data.readers.map((r) => (
                <div key={r.employee_id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2"><Avatar name={r.full_name} size="sm" /><span className="text-slate-700">{r.full_name}</span></div>
                  <span className="text-xs text-slate-400">{formatDate(r.read_at)}</span>
                </div>
              ))}
            </div>
          </div>
          {data.notRead.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">لم يطّلعوا بعد ({data.notRead.length})</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {data.notRead.map((e) => (
                  <div key={e.employee_id} className="flex items-center gap-2 text-sm">
                    <Avatar name={e.full_name} size="sm" /><span className="text-slate-600">{e.full_name}</span>
                    {e.job_title && <span className="text-xs text-slate-400">· {e.job_title}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export default function Announcements() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [viewingReads, setViewingReads] = useState(null)
  const canPost = CAN_POST.includes(user?.role)

  const { data: items = [], isLoading } = useQuery('announcements', announcementsApi.list)

  const removeMutation = useMutation((id) => announcementsApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('announcements') },
    onError: () => toast.error('فشل الحذف'),
  })

  const readMutation = useMutation((id) => announcementsApi.markRead(id), {
    onSuccess: () => { toast.success('تم تسجيل اطلاعك'); qc.invalidateQueries('announcements') },
    onError: (err) => toast.error(err.response?.data?.error || 'فشلت العملية'),
  })

  if (isLoading) return <Spinner fullscreen />

  return (
    <div className="space-y-6">
      {canPost && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-5 h-5" />
            إعلان جديد
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={Megaphone} title="لا توجد إعلانات" /></div>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <div key={a.id} className={`card ${a.is_pinned ? 'border-r-4 border-r-primary-500' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {a.is_pinned ? <Pin className="w-4 h-4 text-primary-500" /> : <Megaphone className="w-4 h-4 text-slate-400" />}
                  <h3 className="font-bold text-slate-800">{a.title}</h3>
                  {!!a.requires_acknowledgment && (
                    <span className={`badge ${a.read_by_me ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {a.read_by_me ? 'تم الاطلاع' : 'يتطلب إقراراً'}
                    </span>
                  )}
                </div>
                {canPost && (
                  <button
                    onClick={() => window.confirm('حذف هذا الإعلان؟') && removeMutation.mutate(a.id)}
                    className="text-slate-300 hover:text-rose-500"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed whitespace-pre-line">{a.body}</p>
              <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {a.created_by_name && <Avatar name={a.created_by_name} size="sm" />}
                  <span>{a.created_by_name || 'النظام'}</span>
                  <span>·</span>
                  <span>{formatDate(a.created_at)}</span>
                </div>
                <div className="flex items-center gap-3">
                  {canPost && (
                    <button onClick={() => setViewingReads(a)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary-600">
                      <Users className="w-3.5 h-3.5" /> اطّلع {a.read_count || 0}
                    </button>
                  )}
                  {!!a.requires_acknowledgment && !a.read_by_me && (
                    <Button variant="secondary" className="!py-1.5 !px-3 text-xs" onClick={() => readMutation.mutate(a.id)} loading={readMutation.isLoading}>
                      <Check className="w-4 h-4" /> تم الاطلاع
                    </Button>
                  )}
                  {!!a.requires_acknowledgment && !!a.read_by_me && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-4 h-4" /> تم إقرارك</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnnouncementForm open={showForm} onClose={() => setShowForm(false)} />
      {viewingReads && <ReadsModal announcement={viewingReads} onClose={() => setViewingReads(null)} />}
    </div>
  )
}
