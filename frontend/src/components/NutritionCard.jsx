import { useSettings } from '../SettingsContext'

const MACROS = [
  { key: 'protein_per_100g', labelKey: 'protein', unit: 'g', max: 40 },
  { key: 'carbs_per_100g', labelKey: 'carbs', unit: 'g', max: 60 },
  { key: 'fat_per_100g', labelKey: 'fat', unit: 'g', max: 40 },
  { key: 'fiber_per_100g', labelKey: 'fiber', unit: 'g', max: 20 },
]

export default function NutritionCard({ nutrition }) {
  const { t } = useSettings()
  if (!nutrition) return null
  const calories = nutrition.calories_per_100g
  const macros = MACROS.filter((m) => nutrition[m.key] !== undefined)

  return (
    <section className="card nutrition-card float-in" style={{ animationDelay: '130ms' }}>
      <header className="card-head">
        <h3>{t('nutrition')}</h3>
        <span className="per-unit">{t('per100g')}</span>
      </header>

      {calories !== undefined && (
        <div className="calories">
          <span className="cal-value">
            {calories}
            <small>kcal</small>
          </span>
          <span className="cal-label">{t('calories')}</span>
        </div>
      )}

      <div className="macro-grid">
        {macros.map((m, i) => {
          const val = nutrition[m.key]
          const pct = Math.min(100, (val / m.max) * 100)
          return (
            <div className="macro" key={m.key}>
              <div
                className="macro-ring"
                style={{ '--p': `${pct * 3.6}deg`, animationDelay: `${i * 90 + 150}ms` }}
              >
                <span className="ring-val">
                  {val}
                  <small>{m.unit}</small>
                </span>
              </div>
              <span className="macro-label">{t(m.labelKey)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}