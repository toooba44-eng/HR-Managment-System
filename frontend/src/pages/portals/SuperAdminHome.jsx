import { Link } from 'react-router-dom'
import {
  Building, Package, CreditCard, Activity, Users, Server, ArrowLeft,
} from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import { useAuthStore } from '../../store/authStore'

const QUICK = [
  { to: '/sa/companies', label: 'الشركات المشتركة', icon: Building, tone: 'text-violet-600 bg-violet-50' },
  { to: '/sa/subscriptions', label: 'الباقات والاشتراكات', icon: Package, tone: 'text-blue-600 bg-blue-50' },
  { to: '/sa/billing', label: 'الفواتير والمدفوعات', icon: CreditCard, tone: 'text-emerald-600 bg-emerald-50' },
  { to: '/sa/usage', label: 'مراقبة الاستخدام', icon: Activity, tone: 'text-amber-600 bg-amber-50' },
]

export default function SuperAdminHome() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <div className="card bg-gradient-to-br from-violet-600 to-violet-800 text-white">
        <p className="text-violet-100 text-sm">بوابة إدارة المنصة</p>
        <h1 className="text-2xl font-extrabold mt-1">مرحباً، {user?.full_name || 'مدير المنصة'}</h1>
        <p className="text-violet-100 mt-2 text-sm leading-relaxed">
          من هنا تُدار المنصة بالكامل: الشركات المشتركة، الاشتراكات، الفوترة، الوحدات، والمراقبة.
          هذه لوحة تمهيدية — الوحدات التفصيلية قيد التطوير ضمن خطة البناء.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building} label="الشركات المشتركة" value="—" tone="violet" hint="قيد التطوير" />
        <StatCard icon={Users} label="إجمالي المستخدمين" value="—" tone="blue" hint="قيد التطوير" />
        <StatCard icon={Package} label="الاشتراكات النشطة" value="—" tone="green" hint="قيد التطوير" />
        <StatCard icon={Server} label="حالة النظام" value="تشغيل" tone="cyan" hint="مستقر" />
      </div>

      <div className="card">
        <h3 className="font-bold text-slate-800 mb-4">إجراءات سريعة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:border-primary-200 hover:shadow-sm transition-all"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${q.tone}`}>
                <q.icon className="w-5 h-5" />
              </div>
              <span className="flex-1 text-sm font-medium text-slate-700">{q.label}</span>
              <ArrowLeft className="w-4 h-4 text-slate-300" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
