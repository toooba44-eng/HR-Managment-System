import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Grid2x2, Users, Award, TrendingDown, Sparkles, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { skillsApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'
import { Field, Input, Button } from '../../components/ui/Form'

// color ramp for proficiency 1..5
const LEVEL_TONE = {
  1: 'bg-rose-100 text-rose-700 border-rose-200',
  2: 'bg-amber-100 text-amber-700 border-amber-200',
  3: 'bg-sky-100 text-sky-700 border-sky-200',
  4: 'bg-blue-100 text-blue-700 border-blue-200',
  5: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

function RatingModal({ emp, skill, levels, onClose }) {
  const qc = useQueryClient()
  const current = emp.skills[skill.name]
  const [level, setLevel] = useState(current || 3)
  const save = useMutation(() => skillsApi.set(emp.id, { skill: skill.name, level }), {
    onSuccess: () => { toast.success('تم الحفظ'); qc.invalidateQueries('skills-matrix'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل'),
  })
  const remove = useMutation(() => skillsApi.remove(emp.id, skill.name), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('skills-matrix'); onClose() },
    onError: () => toast.error('فشل'),
  })
  return (
    <Modal open onClose={onClose} title={`${emp.full_name} — ${skill.name}`}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">مستوى الإتقان</p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" onClick={() => setLevel(v)}
                className={`py-2 rounded-xl text-xs border transition-colors ${level === v ? LEVEL_TONE[v] + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                <span className="block font-bold">{v}</span>{levels[v]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-between gap-3 pt-2">
          {current ? <Button variant="secondary" onClick={() => remove.mutate()} className="text-rose-500">حذف</Button> : <span />}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>إلغاء</Button>
            <Button onClick={() => save.mutate()} loading={save.isLoading}>حفظ</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function AddSkillModal({ employees, onClose }) {
  const qc = useQueryClient()
  const [empId, setEmpId] = useState(employees[0]?.id || '')
  const [name, setName] = useState('')
  const [level, setLevel] = useState(3)
  const save = useMutation(() => skillsApi.set(empId, { skill: name.trim(), level }), {
    onSuccess: () => { toast.success('تمت الإضافة'); qc.invalidateQueries('skills-matrix'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل'),
  })
  return (
    <Modal open onClose={onClose} title="إضافة تقييم مهارة">
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) save.mutate() }} className="space-y-4">
        <Field label="الموظف" required>
          <select value={empId} onChange={(e) => setEmpId(Number(e.target.value))} className="input-field">
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </Field>
        <Field label="المهارة" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: تحليل البيانات" required />
        </Field>
        <Field label="المستوى (1-5)" required>
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className="input-field">
            {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={save.isLoading}>إضافة</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function SkillsMatrix() {
  const { data, isLoading } = useQuery('skills-matrix', () => skillsApi.matrix())
  const [editing, setEditing] = useState(null) // { emp, skill }
  const [adding, setAdding] = useState(false)

  if (isLoading) return <Spinner fullscreen />
  const emps = data?.employees || []
  const skills = data?.skills || []
  const levels = data?.levels || {}
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} label="الموظفون" value={s.employees ?? 0} tone="blue" />
        <StatCard icon={Grid2x2} label="المهارات" value={s.skills ?? 0} tone="violet" />
        <StatCard icon={Award} label="التقييمات" value={s.ratings ?? 0} tone="green" />
        <StatCard icon={TrendingDown} label="فجوات (≤2)" value={s.gaps ?? 0} tone="rose" />
        <StatCard icon={Sparkles} label="خبراء (5)" value={s.experts ?? 0} tone="amber" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)}><Plus className="w-5 h-5" /> إضافة مهارة</Button>
      </div>

      {skills.length === 0 ? (
        <div className="card"><EmptyState icon={Grid2x2} title="لا توجد مهارات بعد" description="ابدأ بإضافة تقييم مهارة لموظف." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <div className="flex items-center gap-2 mb-3"><Grid2x2 className="w-5 h-5 text-slate-400" /><h3 className="font-bold text-slate-800">مصفوفة المهارات</h3></div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky right-0 bg-white text-right p-2 font-semibold text-slate-600 min-w-[160px]">الموظف</th>
                {skills.map((sk) => (
                  <th key={sk.name} className="p-2 text-center font-medium text-slate-500 min-w-[64px]">
                    <div className="whitespace-nowrap">{sk.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">متوسط {sk.avg}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emps.map((emp) => (
                <tr key={emp.id} className="border-t border-slate-100">
                  <td className="sticky right-0 bg-white p-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={emp.full_name} src={emp.profile_picture} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 truncate">{emp.full_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{emp.job_title}</p>
                      </div>
                    </div>
                  </td>
                  {skills.map((sk) => {
                    const lv = emp.skills[sk.name]
                    return (
                      <td key={sk.name} className="p-1 text-center">
                        <button onClick={() => setEditing({ emp, skill: sk })}
                          title={lv ? `${sk.name}: ${levels[lv]}` : `تقييم ${sk.name}`}
                          className={`w-9 h-9 rounded-lg border text-xs font-bold flex items-center justify-center mx-auto transition-transform hover:scale-110 ${lv ? LEVEL_TONE[lv] : 'bg-slate-50 text-slate-300 border-dashed border-slate-200'}`}>
                          {lv || '+'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            {[1, 2, 3, 4, 5].map((v) => (
              <span key={v} className="flex items-center gap-1.5">
                <span className={`w-4 h-4 rounded border ${LEVEL_TONE[v]}`} /> {v} · {levels[v]}
              </span>
            ))}
          </div>
        </div>
      )}

      {editing && <RatingModal emp={editing.emp} skill={editing.skill} levels={levels} onClose={() => setEditing(null)} />}
      {adding && <AddSkillModal employees={emps} onClose={() => setAdding(false)} />}
    </div>
  )
}
