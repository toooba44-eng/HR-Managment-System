import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Send, Headset } from 'lucide-react'
import toast from 'react-hot-toast'
import { candidateApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import { formatDate } from '../../lib/utils'

export default function CandidateContact() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const { data, isLoading } = useQuery('cand-messages', () => candidateApi.messages())
  const send = useMutation((body) => candidateApi.sendMessage(body), {
    onSuccess: () => { setText(''); qc.invalidateQueries('cand-messages') },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل الإرسال')),
  })

  if (isLoading) return <Spinner fullscreen />
  const messages = data?.messages || []

  const submit = (e) => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()) }

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Headset className="w-5 h-5" /></div>
        <div>
          <p className="font-bold text-slate-800">{t('فريق التوظيف')}</p>
          <p className="text-xs text-emerald-500">{t('متصل — يرد عادةً خلال يوم عمل')}</p>
        </div>
      </div>

      <div className="card">
        <div className="space-y-3 max-h-[50vh] overflow-y-auto mb-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'candidate' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${m.sender === 'candidate' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-700 rounded-tl-sm'}`}>
                <p className="text-sm leading-relaxed">{m.body}</p>
                <p className={`text-[10px] mt-1 ${m.sender === 'candidate' ? 'text-white/70' : 'text-slate-400'}`}>{m.sender === 'candidate' ? t('أنت') : t('فريق التوظيف')} · {formatDate(m.created_at)}</p>
              </div>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-slate-400 text-center py-6">{t('ابدأ المحادثة مع فريق التوظيف')}</p>}
        </div>
        <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('اكتب رسالتك…')} className="input-field flex-1" />
          <button type="submit" disabled={!text.trim() || send.isLoading} className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40"><Send className="w-5 h-5" /></button>
        </form>
      </div>
    </div>
  )
}
