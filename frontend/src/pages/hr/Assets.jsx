import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Package, Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import { assetsApi, employeesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'super_admin']

function AssetForm({ open, onClose, editing }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(editing || { name: '', category: 'أجهزة حاسب', serial_number: '', notes: '' })
  const mutation = useMutation(
    (data) => (editing ? assetsApi.update(editing.id, data) : assetsApi.create(data)),
    { onSuccess: () => { toast.success(editing ? 'تم التحديث' : 'تمت الإضافة'); qc.invalidateQueries('assets'); onClose() }, onError: () => toast.error('فشلت العملية') }
  )
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل أصل' : 'إضافة أصل'}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        <Field label="اسم الأصل" required><Input value={form.name} onChange={set('name')} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="التصنيف"><Input value={form.category} onChange={set('category')} placeholder="أجهزة حاسب، جوال..." /></Field>
          <Field label="الرقم التسلسلي"><Input value={form.serial_number} onChange={set('serial_number')} /></Field>
        </div>
        <Field label="ملاحظات"><Textarea value={form.notes} onChange={set('notes')} rows={2} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>حفظ</Button>
        </div>
      </form>
    </Modal>
  )
}

function AssignModal({ asset, onClose }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-for-assets', () => employeesApi.list({ limit: 100 }))
  const [empId, setEmpId] = useState('')
  const mutation = useMutation((assigned_to) => assetsApi.update(asset.id, { assigned_to }), {
    onSuccess: () => { toast.success('تم تحديث التخصيص'); qc.invalidateQueries('assets'); onClose() },
    onError: () => toast.error('فشل التخصيص'),
  })
  const employees = emps?.employees || []
  return (
    <Modal open={!!asset} onClose={onClose} title={`تخصيص: ${asset.name}`}>
      <div className="space-y-4">
        <Field label="الموظف">
          <Select value={empId} onChange={(e) => setEmpId(e.target.value)}>
            <option value="">اختر موظفاً</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select>
        </Field>
        <div className="flex justify-between gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => mutation.mutate(null)} className="text-rose-500 border-rose-200">
            <UserX className="w-4 h-4" /> إلغاء التخصيص
          </Button>
          <Button onClick={() => empId && mutation.mutate(Number(empId))} loading={mutation.isLoading}>
            <UserCheck className="w-4 h-4" /> تخصيص
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Assets() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [assigning, setAssigning] = useState(null)

  const { data, isLoading } = useQuery('assets', () => assetsApi.list())
  const removeMutation = useMutation((id) => assetsApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('assets') },
    onError: () => toast.error('فشل الحذف'),
  })

  if (isLoading) return <Spinner fullscreen />
  const assets = data?.assets || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="إجمالي الأصول" value={s.total ?? 0} tone="violet" />
        <StatCard icon={UserCheck} label="مُخصّصة" value={s.assigned ?? 0} tone="blue" />
        <StatCard icon={Package} label="متاحة" value={s.available ?? 0} tone="green" />
        <StatCard icon={Package} label="صيانة" value={s.maintenance ?? 0} tone="amber" />
      </div>

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="w-5 h-5" /> إضافة أصل</Button>
        </div>
      )}

      {assets.length === 0 ? (
        <div className="card"><EmptyState icon={Package} title="لا توجد أصول" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {assets.map((a) => (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><Package className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><h3 className="font-bold text-slate-800 truncate">{a.name}</h3><Badge status={a.status} /></div>
                    <p className="text-xs text-slate-400 mt-0.5">{a.category}{a.serial_number ? ` · ${a.serial_number}` : ''}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setAssigning(a)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-600" title="تخصيص"><UserCheck className="w-4 h-4" /></button>
                    <button onClick={() => { setEditing(a); setShowForm(true) }} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => window.confirm('حذف الأصل؟') && removeMutation.mutate(a.id)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>{a.assigned_to_name ? `بعهدة: ${a.assigned_to_name}` : 'غير مخصّص'}</span>
                {a.assigned_date && <span>منذ {formatDate(a.assigned_date)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <AssetForm open={showForm} onClose={() => setShowForm(false)} editing={editing} />}
      {assigning && <AssignModal asset={assigning} onClose={() => setAssigning(null)} />}
    </div>
  )
}
