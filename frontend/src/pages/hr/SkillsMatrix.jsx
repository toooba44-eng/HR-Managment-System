import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Grid2x2, Users, Award, TrendingDown, Sparkles, Plus, Target, Trash2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { skillsApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'
import { Field, Input, Select, Button } from '../../components/ui/Form'

// color ramp for proficiency 1..5
const LEVEL_TONE = {
  1: 'bg-rose-100 text-rose-700 border-rose-200',
  2: 'bg-amber-100 text-amber-700 border-amber-200',
  3: 'bg-sky-100 text-sky-700 border-sky-200',
  4: 'bg-blue-100 text-blue-700 border-blue-200',
  5: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

function RatingModal({ emp, skill, levels, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const current = emp.skills[skill.name]
  const [level, setLevel] = useState(current || 3)
  const save = useMutation(() => skillsApi.set(emp.id, { skill: skill.name, level }), {
    onSuccess: () => { toast.success(t('تم الحفظ')); qc.invalidateQueries('skills-matrix'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل')),
  })
  const remove = useMutation(() => skillsApi.remove(emp.id, skill.name), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('skills-matrix'); onClose() },
    onError: () => toast.error(t('فشل')),
  })
  return (
    <Modal open onClose={onClose} title={`${emp.full_name} — ${skill.name}`}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">{t('مستوى الإتقان')}</p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" onClick={() => setLevel(v)}
                className={`py-2 rounded-xl text-xs border transition-colors ${level === v ? LEVEL_TONE[v] + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                <span className="block font-bold">{v}</span>{t(levels[v])}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-between gap-3 pt-2">
          {current ? <Button variant="secondary" onClick={() => remove.mutate()} className="text-rose-500">{t('حذف')}</Button> : <span />}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
            <Button onClick={() => save.mutate()} loading={save.isLoading}>{t('حفظ')}</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function AddSkillModal({ employees, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [empId, setEmpId] = useState(employees[0]?.id || '')
  const [name, setName] = useState('')
  const [level, setLevel] = useState(3)
  const save = useMutation(() => skillsApi.set(empId, { skill: name.trim(), level }), {
    onSuccess: () => { toast.success(t('تمت الإضافة')); qc.invalidateQueries('skills-matrix'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل')),
  })
  return (
    <Modal open onClose={onClose} title={t('إضافة تقييم مهارة')}>
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) save.mutate() }} className="space-y-4">
        <Field label={t('الموظف')} required>
          <select value={empId} onChange={(e) => setEmpId(Number(e.target.value))} className="input-field">
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </Field>
        <Field label={t('المهارة')} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('مثال: تحليل البيانات')} required />
        </Field>
        <Field label={t('المستوى (1-5)')} required>
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className="input-field">
            {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={save.isLoading}>{t('إضافة')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddRequirementModal({ onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [jobTitle, setJobTitle] = useState('')
  const [skill, setSkill] = useState('')
  const [level, setLevel] = useState(3)
  const save = useMutation(() => skillsApi.setRequirement({ job_title: jobTitle.trim(), skill: skill.trim(), required_level: level }), {
    onSuccess: () => { toast.success(t('تم حفظ المتطلب')); qc.invalidateQueries('skills-requirements'); qc.invalidateQueries('skills-gaps'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل الحفظ')),
  })
  return (
    <Modal open onClose={onClose} title={t('تحديد متطلب مهارة لمسمى وظيفي')}>
      <form onSubmit={(e) => { e.preventDefault(); if (jobTitle.trim() && skill.trim()) save.mutate() }} className="space-y-4">
        <Field label={t('المسمى الوظيفي')} required>
          <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder={t('مثال: مطور واجهات أمامية')} required />
        </Field>
        <Field label={t('المهارة')} required>
          <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder={t('مثال: JavaScript')} required />
        </Field>
        <Field label={t('المستوى المطلوب (1-5)')} required>
          <Select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={save.isLoading}>{t('حفظ')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function GapAnalysisTab() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: reqData, isLoading: reqLoading } = useQuery('skills-requirements', () => skillsApi.requirements())
  const { data: gapData, isLoading: gapLoading } = useQuery('skills-gaps', () => skillsApi.gaps())
  const [adding, setAdding] = useState(false)

  const removeReq = useMutation((id) => skillsApi.removeRequirement(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('skills-requirements'); qc.invalidateQueries('skills-gaps') },
    onError: () => toast.error(t('فشل الحذف')),
  })

  if (reqLoading || gapLoading) return <Spinner />
  const requirements = reqData?.requirements || []
  const levels = reqData?.levels || {}
  const gapEmployees = gapData?.employees || []
  const summary = gapData?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Target} label={t('متطلبات محدَّدة')} value={requirements.length} tone="blue" />
        <StatCard icon={Users} label={t('موظفون لديهم فجوات')} value={summary.employeesWithGaps ?? 0} tone="rose" />
        <StatCard icon={AlertTriangle} label={t('إجمالي نقاط النقص')} value={summary.totalShortfalls ?? 0} tone="amber" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Target className="w-5 h-5 text-slate-400" /> {t('متطلبات المهارات حسب المسمى الوظيفي')}</h3>
          <Button onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> {t('إضافة متطلب')}</Button>
        </div>
        {requirements.length === 0 ? (
          <EmptyState icon={Target} title={t('لا توجد متطلبات محدَّدة بعد')} description={t('أضف متطلب مهارة لمسمى وظيفي لبدء تحليل الفجوات.')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-slate-400 text-xs">
                  <th className="text-right p-2 font-medium">{t('المسمى الوظيفي')}</th>
                  <th className="text-right p-2 font-medium">{t('المهارة')}</th>
                  <th className="p-2 font-medium text-center">{t('المستوى المطلوب')}</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="p-2 text-slate-700">{r.job_title}</td>
                    <td className="p-2 text-slate-600">{r.skill}</td>
                    <td className="p-2 text-center">
                      <span className={`badge ${LEVEL_TONE[r.required_level]}`}>{r.required_level} · {t(levels[r.required_level])}</span>
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => removeReq.mutate(r.id)} className="w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 flex items-center justify-center mx-auto">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-slate-400" /> {t('الموظفون ذوو الفجوات')}</h3>
        {gapEmployees.length === 0 ? (
          <EmptyState icon={Sparkles} title={t('لا توجد فجوات حالياً')} description={t('جميع الموظفين يستوفون متطلبات مسمياتهم الوظيفية (أو لا توجد متطلبات محدَّدة بعد).')} />
        ) : (
          <div className="space-y-3">
            {gapEmployees.map((e) => (
              <div key={e.employee_id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={e.full_name} src={e.profile_picture} size="sm" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 truncate">{e.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">{e.job_title} · {e.department_name || '—'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {e.shortfalls.map((s, i) => (
                    <span key={i} className="badge bg-rose-50 text-rose-600 border border-rose-100">
                      {s.skill}: {s.actual_level || '—'} ← {s.required_level}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {adding && <AddRequirementModal onClose={() => setAdding(false)} />}
    </div>
  )
}

function MatrixTab() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery('skills-matrix', () => skillsApi.matrix())
  const [editing, setEditing] = useState(null) // { emp, skill }
  const [adding, setAdding] = useState(false)

  if (isLoading) return <Spinner />
  const emps = data?.employees || []
  const skills = data?.skills || []
  const levels = data?.levels || {}
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} label={t('الموظفون')} value={s.employees ?? 0} tone="blue" />
        <StatCard icon={Grid2x2} label={t('المهارات')} value={s.skills ?? 0} tone="violet" />
        <StatCard icon={Award} label={t('التقييمات')} value={s.ratings ?? 0} tone="green" />
        <StatCard icon={TrendingDown} label={t('فجوات (≤2)')} value={s.gaps ?? 0} tone="rose" />
        <StatCard icon={Sparkles} label={t('خبراء (5)')} value={s.experts ?? 0} tone="amber" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)}><Plus className="w-5 h-5" /> {t('إضافة مهارة')}</Button>
      </div>

      {skills.length === 0 ? (
        <div className="card"><EmptyState icon={Grid2x2} title={t('لا توجد مهارات بعد')} description={t('ابدأ بإضافة تقييم مهارة لموظف.')} /></div>
      ) : (
        <div className="card overflow-x-auto">
          <div className="flex items-center gap-2 mb-3"><Grid2x2 className="w-5 h-5 text-slate-400" /><h3 className="font-bold text-slate-800">{t('مصفوفة المهارات')}</h3></div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky right-0 bg-white text-right p-2 font-semibold text-slate-600 min-w-[160px]">{t('الموظف')}</th>
                {skills.map((sk) => (
                  <th key={sk.name} className="p-2 text-center font-medium text-slate-500 min-w-[64px]">
                    <div className="whitespace-nowrap">{sk.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{t('متوسط', { context: 'avg' })} {sk.avg}</div>
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
                          title={lv ? `${sk.name}: ${t(levels[lv])}` : t('تقييم {{skill}}', { skill: sk.name })}
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
                <span className={`w-4 h-4 rounded border ${LEVEL_TONE[v]}`} /> {v} · {t(levels[v])}
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

export default function SkillsMatrix() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('matrix')
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setTab('matrix')} className={`text-sm px-4 py-2 rounded-xl font-medium transition-colors ${tab === 'matrix' ? 'bg-primary-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
          {t('مصفوفة المهارات')}
        </button>
        <button onClick={() => setTab('gaps')} className={`text-sm px-4 py-2 rounded-xl font-medium transition-colors ${tab === 'gaps' ? 'bg-primary-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
          {t('تحليل الفجوات')}
        </button>
      </div>
      {tab === 'matrix' ? <MatrixTab /> : <GapAnalysisTab />}
    </div>
  )
}
