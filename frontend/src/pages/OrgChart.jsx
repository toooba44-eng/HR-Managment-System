import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Network, Search, ChevronDown, ChevronLeft, Users, UserCircle, UserCog } from 'lucide-react'
import toast from 'react-hot-toast'
import { employeesApi, departmentsApi } from '../api/endpoints'
import Avatar from '../components/ui/Avatar'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import StatCard from '../components/ui/StatCard'
import Modal from '../components/ui/Modal'
import { Field, Select, Button } from '../components/ui/Form'

function collectIds(node) {
  const ids = [node.id]
  for (const c of node.children || []) ids.push(...collectIds(c))
  return ids
}

function ReassignModal({ node, allEmployees, departments, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const excluded = useMemo(() => new Set(collectIds(node)), [node])
  const [departmentId, setDepartmentId] = useState(node.department_id ?? '')
  const [managerId, setManagerId] = useState(node.manager_id ?? '')

  const mutation = useMutation(
    () => employeesApi.update(node.id, {
      department_id: departmentId ? Number(departmentId) : null,
      manager_id: managerId ? Number(managerId) : null,
    }),
    {
      onSuccess: () => {
        toast.success(t('تم نقل الموظف بنجاح'))
        qc.invalidateQueries('org-chart')
        qc.invalidateQueries('employees')
        onClose()
      },
      onError: (err) => toast.error(err.response?.data?.error || t('فشل النقل')),
    }
  )

  const managerOptions = allEmployees.filter((e) => !excluded.has(e.id))

  return (
    <Modal open onClose={onClose} title={t('نقل {{name}}', { name: node.full_name })}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
        <Field label={t('الإدارة')}>
          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">{t('بدون إدارة')}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>
        <Field label={t('المدير المباشر')}>
          <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">{t('لا يوجد — على قمة الهرم')}</option>
            {managerOptions.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name} — {e.job_title}</option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={mutation.isLoading}>{t('حفظ النقل')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function Node({ node, depth, expandedAll, query, onReassign }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const isOpen = expandedAll ?? open
  const match = query && node.full_name.includes(query)

  return (
    <div className={depth > 0 ? 'border-r-2 border-slate-100 pr-4 mr-4' : ''}>
      <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${match ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-white'} hover:shadow-sm`}>
        {hasChildren ? (
          <button onClick={() => setOpen((o) => !o)} className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        ) : <span className="w-6 shrink-0" />}
        <Avatar name={node.full_name} src={node.profile_picture} size="sm" />
        <div className="flex-1 min-w-0">
          <Link to={`/employees/${node.id}`} className="text-sm font-bold text-slate-800 hover:text-blue-600 truncate block">{node.full_name}</Link>
          <p className="text-xs text-slate-400 truncate">{node.job_title}</p>
        </div>
        {node.department_name && <span className="badge hidden sm:inline-block" style={{ backgroundColor: `${node.department_color}18`, color: node.department_color || '#64748b' }}>{node.department_name}</span>}
        {hasChildren && (
          <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0" title={t('إجمالي التابعين')}><Users className="w-3.5 h-3.5" /> {node.total_reports}</span>
        )}
        <button
          onClick={() => onReassign(node)}
          className="w-7 h-7 rounded-lg hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-slate-400 shrink-0"
          title={t('نقل الموظف لإدارة/مدير آخر')}
        >
          <UserCog className="w-4 h-4" />
        </button>
      </div>
      {hasChildren && isOpen && (
        <div className="mt-2 space-y-2">
          {node.children.map((c) => <Node key={c.id} node={c} depth={depth + 1} expandedAll={expandedAll} query={query} onReassign={onReassign} />)}
        </div>
      )}
    </div>
  )
}

export default function OrgChart() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery('org-chart', () => employeesApi.orgChart())
  const { data: departments = [] } = useQuery('departments', departmentsApi.list)
  const [query, setQuery] = useState('')
  const [expandedAll, setExpandedAll] = useState(null)
  const [reassignNode, setReassignNode] = useState(null)

  const stats = useMemo(() => {
    const tree = data?.tree || []
    const flat = []
    const walk = (n) => { flat.push(n); (n.children || []).forEach(walk) }
    tree.forEach(walk)
    const managers = flat.filter((n) => (n.children || []).length > 0).length
    const maxDepth = (nodes, d = 1) => nodes.reduce((m, n) => Math.max(m, n.children?.length ? maxDepth(n.children, d + 1) : d), 0)
    return { total: data?.total ?? flat.length, managers, levels: maxDepth(tree), heads: tree.length, flat }
  }, [data])

  if (isLoading) return <Spinner fullscreen />
  const tree = data?.tree || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label={t('إجمالي الموظفين')} value={stats.total} tone="blue" />
        <StatCard icon={UserCircle} label={t('المدراء')} value={stats.managers} tone="violet" />
        <StatCard icon={Network} label={t('المستويات الإدارية')} value={stats.levels} tone="green" />
        <StatCard icon={UserCircle} label={t('قمة الهرم')} value={stats.heads} tone="amber" />
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('ابحث عن موظف…')} className="input-field w-full pr-9" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setExpandedAll(true)} className="text-sm px-3 py-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100">{t('توسيع الكل')}</button>
            <button onClick={() => setExpandedAll(false)} className="text-sm px-3 py-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100">{t('طيّ الكل')}</button>
            <button onClick={() => setExpandedAll(null)} className="text-sm px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100">{t('إعادة تعيين')}</button>
          </div>
        </div>

        {tree.length === 0 ? (
          <EmptyState icon={Network} title={t('لا يوجد هيكل تنظيمي')} />
        ) : (
          <div className="space-y-2 overflow-x-auto">
            {tree.map((n) => <Node key={n.id} node={n} depth={0} expandedAll={expandedAll} query={query.trim()} onReassign={setReassignNode} />)}
          </div>
        )}
      </div>

      {reassignNode && (
        <ReassignModal
          node={reassignNode}
          allEmployees={stats.flat}
          departments={departments}
          onClose={() => setReassignNode(null)}
        />
      )}
    </div>
  )
}
