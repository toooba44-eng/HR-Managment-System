import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.js'

// Arabic is the app's native language, so its own JSX text doubles as the
// translation key (t('نص عربي')) — no ar.json is needed since i18next's
// default missing-key behavior returns the key itself. Only English needs
// an explicit resource bundle mapping each Arabic string to its translation.
const STORAGE_KEY = 'quant-hr-language'
const savedLang = localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ar'

export function applyDocumentDirection(lang) {
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: {} } },
  lng: savedLang,
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
})

applyDocumentDirection(savedLang)

i18n.on('languageChanged', (lang) => {
  localStorage.setItem(STORAGE_KEY, lang)
  applyDocumentDirection(lang)
})

export default i18n
