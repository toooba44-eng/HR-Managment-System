import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { HardDrive, Users, Save, Building } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformApi, companiesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Form'

function Row({ company }) {
  const qc = useQueryClient()
  const [users, setUsers] = useState(company.users_limit)
  const [storage, setStorage] = useState(company.storage_limit_gb)
  const m = useMutation(() => platformApi.setLimits(company.id, { users_limit: users, storage_limit_gb: storage }), {
    onSuccess: () => { toast.success('تم حفظ الحدود'); qc.invalidateQueries('companies') }, onError: () => toast.error('فشل'),
  })
  const dirty = Number(users) !== company.users_limit || Number(storage) !== company.storage_limit_gb
  return (
    <div className="card flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-[180px]">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Building className="w-5 h-5" /></div>
        <div>
          <p className="font-bold text-slate-800">{company.name}</p>
          <span className="badge bg-slate-100 text-slate-600">{company.plan}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-slate-300" />
        <Input type="number" min="1" value={users} onChange={(e) => setUsers(e.target.value)} className="!w-24" />
        <span className="text-xs text-slate-400">مستخدم</span>
      </div>
      <div className="flex items-center gap-2">
        <HardDrive className="w-4 h-4 text-slate-300" />
        <Input type="number" min="1" value={storage} onChange={(e) => setStorage(e.target.value)} className="!w-24" />
        <span className="text-xs text-slate-400">GB</span>
      </div>
      <button onClick={() => m.mutate()} disabled={!dirty || m.isLoading} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm flex items-center gap-1 disabled:opacity-40"><Save className="w-4 h-4" /> حفظ</button>
    </div>
  )
}

export default function Limits() {
  const { data, isLoading } = useQuery('companies', companiesApi.list)
  if (isLoading) return <Spinner fullscreen />
  const companies = data?.companies || []
  return (
    <div className="space-y-4">
      {companies.length === 0 ? (
        <div className="card"><EmptyState icon={HardDrive} title="لا توجد مؤسسات" /></div>
      ) : companies.map((c) => <Row key={c.id} company={c} />)}
    </div>
  )
}
