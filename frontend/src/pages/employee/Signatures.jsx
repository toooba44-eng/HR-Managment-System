import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { FileSignature, Plus, Trash2, PenLine, X, FileCheck2, Clock, Files } from 'lucide-react'
import toast from 'react-hot-toast'
import { signaturesApi, employeesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'super_admin']
const DOC_TYPES = ['عقد', 'ملحق', 'سياسة', 'إقرار', 'خطاب', 'أخرى']

function RequestModal({ onClose }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }))
  const [form, setForm] = useState({ employee_id: '', title: '', doc_type: 'عقد' })
  const m = useMutation((d) => signaturesApi.create(d), {
    onSuccess: () => { toast.success('تم إرسال طلب التوقيع'); qc.invalidateQueries('signatures'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title="طلب توقيع مستند">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label="الموظف" required>
          <Select value={form.employee_id} onChange={set('employee_id')} required>
            <option value="">اختر</option>
            {(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select>
        </Field>
        <Field label="عنوان المستند" required><Input value={form.title} onChange={set('title')} required /></Field>
        <Field label="النوع"><Select value={form.doc_type} onChange={set('doc_type')}>{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>إرسال</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Signatures() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showRequest, setShowRequest] = useState(false)
  const { data, isLoading } = useQuery('signatures', () => signaturesApi.list())
  const sign = useMutation((id) => signaturesApi.sign(id), { onSuccess: () => { toast.success('تم التوقيع'); qc.invalidateQueries('signatures') }, onError: () => toast.error('فشل') })
  const decline = useMutation((id) => signaturesApi.decline(id), { onSuccess: () => { toast.success('تم الرفض'); qc.invalidateQueries('signatures') }, onError: () => toast.error('فشل') })
  const del = useMutation((id) => signaturesApi.remove(id), { onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('signatures') }, onError: () => toast.error('فشل') })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.signatures || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Files} label="إجمالي المستندات" value={s.total ?? 0} tone="blue" />
        <StatCard icon={Clock} label="بانتظار التوقيع" value={s.pending ?? 0} tone="amber" />
        <StatCard icon={FileCheck2} label="موقّعة" value={s.signed ?? 0} tone="green" />
      </div>

      {canManage && <div className="flex justify-end"><Button onClick={() => setShowRequest(true)}><Plus className="w-5 h-5" /> طلب توقيع</Button></div>}

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={FileSignature} title="لا توجد مستندات للتوقيع" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-400 border-b border-slate-100">
                {canManage && <th className="pb-3 font-medium">الموظف</th>}
                <th className="pb-3 font-medium">المستند</th>
                <th className="pb-3 font-medium">النوع</th>
                <th className="pb-3 font-medium">تاريخ التوقيع</th>
                <th className="pb-3 font-medium">الحالة</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((sg) => (
                <tr key={sg.id}>
                  {canManage && (
                    <td className="py-3"><div className="flex items-center gap-2"><Avatar name={sg.full_name} size="sm" /><span className="text-slate-700">{sg.full_name}</span></div></td>
                  )}
                  <td className="py-3">
                    <div className="flex items-center gap-2 text-slate-700"><FileSignature className="w-4 h-4 text-slate-300" /> {sg.title}</div>
                  </td>
                  <td className="py-3 text-slate-500">{sg.doc_type}</td>
                  <td className="py-3 text-slate-500">{sg.signed_at ? formatDate(sg.signed_at) : '—'}</td>
                  <td className="py-3"><Badge status={sg.status} /></td>
                  <td className="py-3">
                    <div className="flex gap-1 justify-end">
                      {sg.employee_id === user?.employee_id && sg.status === 'بانتظار التوقيع' && (
                        <>
                          <button onClick={() => sign.mutate(sg.id)} className="text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1"><PenLine className="w-3.5 h-3.5" /> توقيع</button>
                          <button onClick={() => decline.mutate(sg.id)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                        </>
                      )}
                      {canManage && <button onClick={() => window.confirm('حذف الطلب؟') && del.mutate(sg.id)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showRequest && <RequestModal onClose={() => setShowRequest(false)} />}
    </div>
  )
}
