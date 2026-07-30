import { useState } from 'react'
import { useQuery } from 'react-query'
import { UserCog, Building, ShieldAlert, LogIn, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { companiesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function Impersonate() {
  const { data, isLoading } = useQuery('companies', companiesApi.list)
  const [session, setSession] = useState(null)

  if (isLoading) return <Spinner fullscreen />
  const companies = data?.companies || []

  const start = (c) => { setSession(c); toast.success(`بدأت جلسة بالنيابة عن ${c.name} (وضع مقيّد)`) }

  return (
    <div className="space-y-6">
      <div className="card flex items-start gap-3 bg-amber-50 border border-amber-100">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">الدخول بالنيابة — وضع مقيّد</p>
          <p className="text-xs text-amber-700 mt-1">تتيح لك الجلسة الاطلاع على بيانات المؤسسة بصلاحيات محدودة للقراءة فقط لأغراض الدعم. جميع الجلسات تُسجّل في سجل العمليات.</p>
        </div>
      </div>

      {session && (
        <div className="card flex items-center gap-3 bg-blue-600 text-white">
          <LogIn className="w-5 h-5" />
          <p className="flex-1 text-sm">جلسة نشطة بالنيابة عن <span className="font-bold">{session.name}</span></p>
          <button onClick={() => { setSession(null); toast('تم إنهاء الجلسة') }} className="flex items-center gap-1 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg"><X className="w-4 h-4" /> إنهاء</button>
        </div>
      )}

      {companies.length === 0 ? (
        <div className="card"><EmptyState icon={UserCog} title="لا توجد مؤسسات" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((c) => (
            <div key={c.id} className="card flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500"><Building className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400">{c.contact_email} · {c.plan}</p>
              </div>
              <button onClick={() => start(c)} disabled={session?.id === c.id} className="text-sm px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1 disabled:opacity-40"><LogIn className="w-4 h-4" /> دخول</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
