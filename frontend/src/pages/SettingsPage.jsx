import { LANGS } from '../i18n/strings'
import { ThemeSwitch } from '../components/ToggleControls'
import { useSettings } from '../SettingsContext'

export default function SettingsPage({ historyCount, onClearHistory }) {
  const { t, lang, setLang, theme } = useSettings()

  return (
    <div className="settings float-in">
      <section className="card setting-card">
        <header className="card-head">
          <h3>{t('settingThemeTitle')}</h3>
        </header>
        <div className="setting-row">
          <span className="setting-row-text">
            {theme === 'dark' ? t('darkMode') : t('lightMode')}
            <small>{t('themeDesc')}</small>
          </span>
          <ThemeSwitch />
        </div>
      </section>

      <section className="card setting-card">
        <header className="card-head">
          <h3>{t('settingLangTitle')}</h3>
        </header>
        <div className="setting-row">
          <span className="setting-row-text">
            {t('language')}
            <small>{t('langDesc')}</small>
          </span>
          <div className="lang-pills">
            {LANGS.map((l) => (
              <button
                key={l.value}
                type="button"
                className={`lang-pill ${lang === l.value ? 'active' : ''}`}
                onClick={() => setLang(l.value)}
              >
                {l.abbr}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card setting-card">
        <header className="card-head">
          <h3>{t('settingDataTitle')}</h3>
        </header>
        <div className="setting-row">
          <span className="setting-row-text">
            {t('settingDataDesc')}
            <small>
              {historyCount ?? 0} {t('navHistory').toLowerCase()}
            </small>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-danger"
            onClick={onClearHistory}
            disabled={!historyCount}
          >
            {t('clearHistory')}
          </button>
        </div>
      </section>
    </div>
  )
}