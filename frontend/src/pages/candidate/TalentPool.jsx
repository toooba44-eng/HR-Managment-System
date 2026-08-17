import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Star, CheckCircle2, Bell, Zap, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { candidateApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Form'

const BENEFITS = [
  { icon: Bell, title: 'إشعارات الوظائف', desc: 'كن أول من يعلم بالوظائف المناسبة لمهاراتك' },
  { icon: Zap, title: 'ترشيح أسرع', desc: 'يصل ملفك لمسؤولي التوظيف مباشرةً عند توفّر شاغر' },
  { icon: Users, title: 'فرص حصرية', desc: 'الوصول لفرص غير معلنة ضمن قاعدة المواهب' },
]

export default function TalentPool() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery('candidate-profile', () => candidateApi.getProfile())
  const m = useMutation((join) => candidateApi.setTalentPool(join), {
    onSuccess: (_, join) => { toast.success(join ? t('انضممت لقاعدة المواهب') : t('تم إلغاء الانضمام')); qc.invalidateQueries('candidate-profile') },
    onError: () => toast.error(t('فشلت العملية')),
  })
  if (isLoading) return <Spinner fullscreen />
  const joined = !!data?.profile?.in_talent_pool

  return (
    <div className="space-y-6">
      <div className={`card text-center ${joined ? 'bg-gradient-to-br from-blue-600 to-violet-700 text-white' : ''}`}>
        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${joined ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
          <Star className={`w-8 h-8 ${joined ? 'fill-current' : ''}`} />
        </div>
        <h2 className="text-xl font-bold mt-4">{joined ? t('أنت عضو في قاعدة المواهب') : t('انضم إلى قاعدة المواهب')}</h2>
        <p className={`text-sm mt-2 ${joined ? 'text-white/80' : 'text-slate-500'}`}>
          {joined ? t('ملفك ظاهر لمسؤولي التوظيف وسيتم إشعارك بالفرص المناسبة.') : t('احفظ ملفك ليصل إلى مسؤولي التوظيف عند توفّر فرص مناسبة.')}
        </p>
        <div className="mt-5">
          {joined ? (
            <button onClick={() => m.mutate(false)} disabled={m.isLoading} className="px-5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium">{t('إلغاء الانضمام')}</button>
          ) : (
            <Button onClick={() => m.mutate(true)} loading={m.isLoading}><Star className="w-4 h-4" /> {t('الانضمام الآن')}</Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {BENEFITS.map((b) => (
          <div key={b.title} className="card">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><b.icon className="w-5 h-5" /></div>
            <h3 className="font-bold text-slate-800 mt-3">{t(b.title)}</h3>
            <p className="text-sm text-slate-500 mt-1">{t(b.desc)}</p>
          </div>
        ))}
      </div>

      {joined && (
        <div className="card flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <p className="text-sm text-slate-600">{t('حالتك:')} <span className="font-medium text-slate-800">{t('عضو نشط في قاعدة المواهب')}</span></p>
        </div>
      )}
    </div>
  )
}
