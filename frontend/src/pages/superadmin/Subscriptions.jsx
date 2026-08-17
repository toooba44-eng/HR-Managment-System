import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Check, Package } from 'lucide-react'
import { companiesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'

const PLANS = [
  { name: 'أساسية', price: '٤٩٩', color: 'from-slate-500 to-slate-700', users: 25, storage: 10, features: ['إدارة الموظفين', 'الحضور والإجازات', 'الدعم عبر البريد'] },
  { name: 'احترافية', price: '٩٩٩', color: 'from-blue-500 to-blue-700', users: 75, storage: 50, features: ['كل مزايا الأساسية', 'الرواتب والتقارير', 'التوظيف', 'دعم ذو أولوية'] },
  { name: 'مؤسسية', price: '٢٤٩٩', color: 'from-violet-600 to-violet-800', users: 200, storage: 100, features: ['كل مزايا الاحترافية', 'تكاملات API', 'مدير حساب مخصّص', 'اتفاقية مستوى خدمة'] },
]

export default function Subscriptions() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery('companies', companiesApi.list)
  if (isLoading) return <Spinner fullscreen />

  const byPlan = data?.summary?.byPlan || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {PLANS.map((p) => (
          <div key={p.name} className="card flex flex-col">
            <div className={`rounded-xl bg-gradient-to-br ${p.color} text-white p-5`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold">{t(p.name)}</h3>
                <Package className="w-5 h-5 opacity-80" />
              </div>
              <p className="mt-3"><span className="text-3xl font-extrabold">{p.price}</span> <span className="text-sm opacity-80">{t('ر.س/شهر')}</span></p>
              <p className="text-xs opacity-90 mt-1">{p.users} {t('مستخدم', { context: 'count' })} · {p.storage}GB {t('تخزين')}</p>
            </div>
            <ul className="mt-4 space-y-2 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> {t(f)}
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
              <span className="text-slate-400">{t('المؤسسات المشتركة')}</span>
              <span className="font-bold text-slate-800">{byPlan[p.name] || 0}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center">
        {t('توزيع الاشتراكات محسوب من المؤسسات المسجّلة في المنصة.')}
      </p>
    </div>
  )
}
