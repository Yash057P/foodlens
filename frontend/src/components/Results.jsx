import NutritionCard from './NutritionCard'
import TopPredictions from './TopPredictions'
import WarningBanner from './WarningBanner'
import { formatLabel, formatPercent, translateServerMessage } from '../utils'
import { useSettings } from '../SettingsContext'

export default function Results({ result }) {
  const { t } = useSettings()
  if (!result) return null
  const { prediction, top_predictions, nutrition_per_100g, nutrition_status, warning, low_confidence } =
    result
  const conf = prediction && prediction.confidence
  const hasConf = typeof conf === 'number' && Number.isFinite(conf)

  const warnKey = warning ? translateServerMessage(warning) : null
  const warningText = warnKey ? t(warnKey) : warning

  return (
    <section className="results">
      <WarningBanner message={warningText} tone={low_confidence ? 'warning' : 'info'} />

      <header className="verdict float-in">
        <span className="verdict-tag">{low_confidence ? t('bestGuess') : t('looksLike')}</span>
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