import { useSettings } from '../SettingsContext'

export default function AboutPage() {
  const { t } = useSettings()

  return (
    <div className="about float-in">
      <div className="about-hero">
        <span className="brand-mark about-mark" aria-hidden="true">
          F
        </span>
        <h2>FoodLens</h2>
        <p className="about-tagline">{t('tagline')}</p>
      </div>
      <div className="about-lines">
        <p>{t('aboutOne')}</p>
        <p>{t('aboutTwo')}</p>
        <p>{t('aboutThree')}</p>
      </div>
      <p className="about-foot">{t('footerNote')}</p>
    </div>
  )
}