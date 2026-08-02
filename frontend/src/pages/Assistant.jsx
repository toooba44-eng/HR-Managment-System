import { useState, useRef, useEffect } from 'react'
import { useMutation } from 'react-query'
import { Bot, Send, Sparkles, Info } from 'lucide-react'
import { assistantApi } from '../api/endpoints'
import { Button } from '../components/ui/Form'

const WELCOME = {
  role: 'assistant',
  text: 'مرحباً! أنا المساعد الذكي لموارد كوانت البشرية. يمكنني الإجابة عن أسئلتك حول رصيد إجازتك، راتبك، حضورك، أو سياسات الشركة.',
  suggestions: ['كم رصيد إجازتي؟', 'كم راتبي الصافي هذا الشهر؟', 'هل سجّلت حضوري اليوم؟', 'ما هي سياسة الإجازات؟'],
}

export default function Assistant() {
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  const ask = useMutation((message) => assistantApi.ask(message), {
    onSuccess: (data) => setMessages((m) => [...m, { role: 'assistant', text: data.answer, suggestions: data.suggestions }]),
    onError: (err) => setMessages((m) => [...m, { role: 'assistant', text: err.response?.data?.error || 'تعذّر الحصول على إجابة الآن.', error: true }]),
  })

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, ask.isLoading])

  const send = (text) => {
    const trimmed = text.trim()
    if (!trimmed || ask.isLoading) return
    setMessages((m) => [...m, { role: 'user', text: trimmed }])
    setInput('')
    ask.mutate(trimmed)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-2xl mx-auto">
      <div className="card mb-3 flex items-center gap-3 bg-gradient-to-l from-violet-50 to-blue-50 border-violet-100">
        <div className="w-11 h-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0"><Bot className="w-6 h-6" /></div>
        <div className="flex-1">
          <p className="font-bold text-slate-800">المساعد الذكي</p>
          <p className="text-xs text-slate-500 flex items-center gap-1"><Info className="w-3 h-3" /> يجيب عن بياناتك الشخصية فقط — لا يتخذ قرارات نهائية بشأن الإجازات أو التوظيف</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 px-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${m.role === 'user' ? 'bg-slate-100 text-slate-700' : m.error ? 'bg-rose-50 text-rose-600' : 'bg-violet-600 text-white'}`}>
              {m.text}
              {m.suggestions && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {m.suggestions.map((s) => (
                    <button key={s} onClick={() => send(s)} className="text-[11px] px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {ask.isLoading && (
          <div className="flex justify-end">
            <div className="rounded-2xl px-4 py-2.5 bg-violet-600 text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> <span className="text-sm">يكتب...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex gap-2 pt-3 border-t border-slate-100 mt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك هنا..."
          className="input-field flex-1"
          dir="rtl"
        />
        <Button type="submit" loading={ask.isLoading}><Send className="w-4 h-4" /></Button>
      </form>
    </div>
  )
}
