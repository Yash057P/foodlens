import { createContext, useContext, useEffect, useState } from 'react'
import { STRINGS } from './i18n/strings'

const SettingsContext = createContext(null)

const THEME_KEY = 'foodlens.theme'
const LANG_KEY = 'foodlens.lang'

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : v
  } catch {
    return fallback
  }
}

export function SettingsProvider({ children }) {
  const [theme, setTheme] = useState(() => read(THEME_KEY, 'light'))
  const [lang, setLang] = useState(() => read(LANG_KEY, 'en'))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {}
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {}
  }, [lang])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  const t = (key) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key

  return (
    <SettingsContext.Provider value={{ theme, setTheme, toggleTheme, lang, setLang, t }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}