import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ListChecks, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformApi, companiesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import { Field, Select } from '../../components/ui/Form'

function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'right-0.5' : 'right-[22px]'}`} />
    </button>
  )
}

export default function Modules() {
  const qc = useQueryClient()
  const { data: companiesData, isLoading: loadingCompanies } = useQuery('companies', companiesApi.list)
  const [companyId, setCompanyId] = useState('')
  const companies = companiesData?.companies || []
  const active = companyId || companies[0]?.id
  const { data, isLoading } = useQuery(['modules', active], () => platformApi.modules(active), { enabled: !!active })
  const toggle = useMutation(({ module_key, enabled }) => platformApi.setModule(active, module_key, enabled), {
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries(['modules', active]) }, onError: () => toast.error('فشل'),
  })

  if (loadingCompanies) return <Spinner fullscreen />
  const modules = data?.modules || []

  return (
    <div className="space-y-6">
      <div className="card">
        <Field label="المؤسسة">
          <Select value={active || ''} onChange={(e) => setCompanyId(e.target.value)}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      </div>

      <div className="card">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><ListChecks className="w-5 h-5 text-slate-400" /> الوحدات المتاحة</h3>
        {isLoading ? <Spinner /> : (
          <div className="space-y-1">
            {modules.map((m) => (
              <div key={m.key} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${m.enabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}><Package className="w-4 h-4" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{m.label}</p>
                  <p className="text-[11px] text-slate-400">{m.enabled ? 'مفعّلة' : 'معطّلة'}</p>
                </div>
                <Toggle checked={!!m.enabled} onChange={(v) => toggle.mutate({ module_key: m.key, enabled: v })} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
