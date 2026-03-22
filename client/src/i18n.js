import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import arTranslation from './locales/ar/translation.json'
import enTranslation from './locales/en/translation.json'

const SUPPORTED_LANGUAGES = ['en', 'ar']
const FALLBACK_LANGUAGE = 'en'

export const normalizeLanguage = (language) =>
  typeof language === 'string' && language.toLowerCase().startsWith('ar')
    ? 'ar'
    : 'en'

const applyDocumentLanguage = (language) => {
  if (typeof document === 'undefined') return

  const nextLanguage = normalizeLanguage(language)
  const isRtl = nextLanguage === 'ar'

  document.documentElement.lang = nextLanguage
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
  if (document.body) {
    document.body.classList.toggle('rtl', isRtl)
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem('cortina_language', nextLanguage)
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      ar: { translation: arTranslation },
    },
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'cortina_language',
    },
  })

applyDocumentLanguage(i18n.resolvedLanguage || i18n.language)
i18n.on('languageChanged', applyDocumentLanguage)

export default i18n
