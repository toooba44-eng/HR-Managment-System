import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'

// Shows the language you'll switch TO, not the current one — the common
// convention for language switchers (a button reading "EN" while the UI is
// in Arabic, and "عربي" once it's in English).
export default function LanguageToggle() {
  const { i18n } = useTranslation()
  const isArabic = i18n.language !== 'en'

  return (
    <button
      onClick={() => i18n.changeLanguage(isArabic ? 'en' : 'ar')}
      className="h-10 px-3 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-slate-500 font-bold text-xs"
      title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <Languages className="w-5 h-5" />
      <span>{isArabic ? 'EN' : 'عربي'}</span>
    </button>
  )
}
