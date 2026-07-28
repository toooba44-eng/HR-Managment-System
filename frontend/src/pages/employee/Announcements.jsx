import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Megaphone, Plus, Pin, Trash2 } from 'lucide-react'
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
  const [form, setForm] = useState({ title: '', body: '', is_pinned: false })

  const mutation = useMutation((data) => announcementsApi.create(data), {
    onSuccess: () => {
      toast.success('تم نشر الإعلان')
      qc.invalidateQueries('announcements')
      onClose()
      setForm({ title: '', body: '', is_pinned: false })
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
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>نشر</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Announcements() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const canPost = CAN_POST.includes(user?.role)

  const { data: items = [], isLoading } = useQuery('announcements', announcementsApi.list)

  const removeMutation = useMutation((id) => announcementsApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('announcements') },
    onError: () => toast.error('فشل الحذف'),
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
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
                {a.created_by_name && <Avatar name={a.created_by_name} size="sm" />}
                <span>{a.created_by_name || 'النظام'}</span>
                <span>·</span>
                <span>{formatDate(a.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnnouncementForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
