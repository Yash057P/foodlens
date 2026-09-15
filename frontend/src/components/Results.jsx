import NutritionCard from './NutritionCard'
import TopPredictions from './TopPredictions'
import WarningBanner from './WarningBanner'
import { formatLabel, formatPercent, translateServerMessage } from '../utils'
import { useSettings } from '../SettingsContext'

export default function Results({ result }) {
  const { t } = useSettings()
  if (!result) return null
  const { prediction, top_predictions, nutrition_per_100g, nutrition_status, warning, low_confidence, fallback } =
    result
  const conf = prediction && prediction.confidence
  const hasConf = typeof conf === 'number' && Number.isFinite(conf)

  const warnKey = warning ? translateServerMessage(warning) : null
  const warningText = warnKey ? t(warnKey) : warning

  if (low_confidence && fallback) {
    return (
      <section className="results">
        {fallback.has_food ? (
          <>
            <div className="fallback-identified float-in">
              <span className="verdict-tag">{t('aiIdentified')}</span>
              <h2 className="verdict-food">{formatLabel(fallback.food_name)}</h2>
              <p className="fallback-desc">{fallback.description}</p>
            </div>
            {nutrition_status === 'available' && <NutritionCard nutrition={nutrition_per_100g} />}
          </>
        ) : (
          <div className="no-food-detected float-in">
            <div className="no-food-icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 15s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
                <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
              </svg>
            </div>
            <h2 className="verdict-food">{t('noFoodDetected')}</h2>
            <p className="fallback-desc">{fallback.description || t('noFoodHint')}</p>
          </div>
        )}
      </section>
    )
  }

  if (low_confidence) {
    return (
      <section className="results">
        <div className="no-food-detected float-in">
          <div className="no-food-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 15s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
              <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
            </svg>
          </div>
          <h2 className="verdict-food">{t('noFoodDetected')}</h2>
          <p className="fallback-desc">{t('noFoodHint')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="results">
      <WarningBanner message={warningText} tone="info" />

      <header className="verdict float-in">
        <span className="verdict-tag">{t('looksLike')}</span>
        <h2 className="verdict-food">{formatLabel(prediction && prediction.food)}</h2>
        {hasConf && <span className="verdict-conf">{formatPercent(conf)}</span>}
        {hasConf && (
          <div className="verdict-meter">
            <span className="verdict-fill" style={{ '--w': `${conf * 100}%` }} />
          </div>
        )}
      </header>

      <TopPredictions predictions={top_predictions} />

      {nutrition_status === 'available' ? (
        <NutritionCard nutrition={nutrition_per_100g} />
      ) : (
        <p className="no-nutrition float-in">
          {nutrition_status === 'not_available' ? t('noNutrition') : t('nutritionHidden')}
        </p>
      )}
    </section>
  )
}