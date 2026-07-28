import { Sparkles } from 'lucide-react'

// Placeholder for portal features that are scaffolded but not yet implemented.
export default function ComingSoon({ title, description, icon: Icon = Sparkles }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-lg shadow-primary-200">
          <Icon className="w-9 h-9" />
        </div>
        <span className="absolute -top-2 -left-2 badge bg-amber-100 text-amber-700 border border-amber-200">
          قريباً
        </span>
      </div>
      <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>
      <p className="text-slate-400 mt-2 max-w-md leading-relaxed">
        {description || 'هذه الميزة مُخطّطة ضمن هيكل النظام وسيتم تفعيلها في مرحلة قادمة.'}
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        قيد التطوير
      </div>
    </div>
  )
}
