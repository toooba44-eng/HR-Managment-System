import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Field, Input, Button } from '../components/ui/Form'

const DEMO_ACCOUNTS = [
  { email: 'admin@quant.com', password: 'admin123', label: 'مدير النظام' },
  { email: 'mohamed.tech@quant.com', password: 'password123', label: 'رئيس قسم' },
  { email: 'khaled.dev@quant.com', password: 'password123', label: 'موظف' },
]

export default function Login() {
  const { login, token, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  if (token) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login({ email, password })
      toast.success('تم تسجيل الدخول بنجاح')
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل تسجيل الدخول')
    }
  }

  const fillDemo = (acc) => {
    setEmail(acc.email)
    setPassword(acc.password)
  }

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 to-primary-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute bottom-0 -right-16 w-80 h-80 bg-white/5 rounded-full" />
        <div className="flex items-center gap-3 relative">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center font-extrabold text-2xl">
            Q
          </div>
          <span className="text-2xl font-extrabold">Quant HR</span>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            نظام إدارة الموارد البشرية
          </h1>
          <p className="text-primary-100 text-lg leading-relaxed">
            إدارة الموظفين، الحضور، الإجازات، والإدارات في منصة واحدة متكاملة وسهلة الاستخدام.
          </p>
        </div>
        <p className="text-primary-200 text-sm relative">© 2026 Quant HR. جميع الحقوق محفوظة.</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white font-extrabold text-2xl">
              Q
            </div>
            <span className="text-2xl font-extrabold text-slate-800">Quant HR</span>
          </div>

          <div className="card">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-1">مرحباً بعودتك</h2>
            <p className="text-slate-400 mb-6">سجّل الدخول للمتابعة إلى حسابك</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="البريد الإلكتروني" required>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@quant.com"
                    className="pr-11"
                    required
                  />
                </div>
              </Field>

              <Field label="كلمة المرور" required>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-11 pl-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </Field>

              <Button type="submit" loading={isLoading} className="w-full">
                <LogIn className="w-5 h-5" />
                تسجيل الدخول
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-3 text-center">حسابات تجريبية (اضغط للتعبئة)</p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => fillDemo(acc)}
                    className="text-xs py-2 px-2 rounded-lg border border-slate-200 hover:border-primary-400 hover:bg-primary-50 text-slate-600 transition-colors"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
