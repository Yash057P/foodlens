import { NAV_ITEMS } from './nav'
import { LangSelect, ThemeSwitch } from './ToggleControls'
import { useSettings } from '../SettingsContext'

export default function Sidebar({ page, setPage }) {
  const { t } = useSettings()

  return (
    <aside className="sidebar">
      <div className="side-brand">
        <span className="brand-mark side-mark" aria-hidden="true">
          F
        </span>
        <h1 className="brand-name side-name">FoodLens</h1>
      </div>
      <p className="side-tagline">{t('tagline')}</p>

      <nav className="side-nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`side-link ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            {item.icon}
            <span>{t(item.labelKey)}</span>
          </button>
        ))}
      </nav>

      <div className="side-controls">
        <div className="side-control-row">
          <span>{t('darkMode')}</span>
          <ThemeSwitch />
        </div>
        <div className="side-control-row">
          <span>{t('language')}</span>
          <LangSelect />
        </div>
      </div>

      <p className="side-foot">{t('footerNote')}</p>
    </aside>
  )
}