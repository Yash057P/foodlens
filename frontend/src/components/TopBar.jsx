import { NAV_ITEMS } from './nav'
import { LangSelect, ThemeSwitch } from './ToggleControls'
import { useSettings } from '../SettingsContext'

const TITLES = { scan: 'navScan', history: 'navHistory', settings: 'navSettings', about: 'navAbout' }

export default function TopBar({ page, setPage, onBack }) {
  const { t } = useSettings()

  return (
    <header className="topbar">
      <div className="topbar-row">
        <button type="button" className="back-btn" onClick={onBack} aria-label={t('back')}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="page-title">{t(TITLES[page])}</h2>
        <div className="top-actions">
          <ThemeSwitch />
          <LangSelect />
        </div>
      </div>
      <nav className="tabs" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            {item.icon}
            <span>{t(item.labelKey)}</span>
          </button>
        ))}
      </nav>
    </header>
  )
}