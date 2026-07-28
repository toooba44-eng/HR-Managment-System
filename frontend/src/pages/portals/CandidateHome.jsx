import { Link } from 'react-router-dom'
import { Search, FileText, ListChecks, Star, ArrowLeft, Briefcase } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const STEPS = [
  { to: '/cand/cv', label: 'ارفع سيرتك الذاتية', icon: FileText, tone: 'text-blue-600 bg-blue-50' },
  { to: '/cand/jobs', label: 'تصفّح الوظائف المتاحة', icon: Search, tone: 'text-emerald-600 bg-emerald-50' },
  { to: '/cand/applications', label: 'تابع حالة طلباتك', icon: ListChecks, tone: 'text-amber-600 bg-amber-50' },
  { to: '/cand/talent-pool', label: 'انضم لقاعدة المواهب', icon: Star, tone: 'text-violet-600 bg-violet-50' },
]

export default function CandidateHome() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <div className="card bg-gradient-to-br from-orange-500 to-orange-700 text-white">
        <p className="text-orange-100 text-sm">بوابة المرشح</p>
        <h1 className="text-2xl font-extrabold mt-1">أهلاً بك، {user?.full_name || 'مرشحنا الكريم'}</h1>
        <p className="text-orange-100 mt-2 text-sm leading-relaxed">
          ابدأ رحلتك المهنية معنا: أكمل ملفك، ارفع سيرتك الذاتية، وتقدّم على الوظائف المناسبة.
          سنبقيك على اطلاع بكل مرحلة من مراحل التوظيف.
        </p>
      </div>

      <div className="card flex flex-col sm:flex-row items-center gap-4 border-dashed">
        <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
          <Briefcase className="w-6 h-6" />
        </div>
        <div className="flex-1 text-center sm:text-right">
          <p className="font-bold text-slate-800">لا توجد طلبات نشطة بعد</p>
          <p className="text-sm text-slate-400">ابدأ بتصفح الوظائف والتقديم على ما يناسبك.</p>
        </div>
        <Link to="/cand/jobs" className="btn-primary sm:w-auto">
          <Search className="w-4 h-4" />
          تصفح الوظائف
        </Link>
      </div>

      <div className="card">
        <h3 className="font-bold text-slate-800 mb-4">خطوات مقترحة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STEPS.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:border-primary-200 hover:shadow-sm transition-all"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.tone}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className="flex-1 text-sm font-medium text-slate-700">{s.label}</span>
              <ArrowLeft className="w-4 h-4 text-slate-300" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
