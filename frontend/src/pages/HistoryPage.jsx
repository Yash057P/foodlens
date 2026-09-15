import { formatDate, formatPercent } from '../utils'
import { useSettings } from '../SettingsContext'

function StatusChip({ status }) {
  const { t } = useSettings()
  if (status === 'available') return <span className="chip chip-ok">100g</span>
  if (status === 'uncertain') return <span className="chip chip-uncertain">{t('nutritionHidden')}</span>
  return <span className="chip chip-muted">{t('noNutrition')}</span>
}

export default function HistoryPage({ history, onClear, onRemove }) {
  const { t, lang } = useSettings()

  if (!history || history.length === 0) {
    return (
      <div className="empty-page float-in">
        <span className="empty-icon" aria-hidden="true">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
        </span>
        <p className="empty-title">{t('homeEmptyTitle')}</p>
        <p className="empty-hint">{t('homeEmptyHint')}</p>
      </div>
    )
  }

  return (
    <div className="history float-in">
      <div className="history-head">
        <span className="history-count">
          {history.length} {t('navHistory').toLowerCase()}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          {t('clearHistory')}
        </button>
      </div>
      <ol className="history-list">
        {history.map((entry, i) => (
          <li className="history-item" style={{ animationDelay: `${i * 60}ms` }} key={entry.id}>
            {entry.thumb ? (
              <img className="history-thumb" src={entry.thumb} alt="" />
            ) : (
              <span className="history-thumb history-thumb-empty" aria-hidden="true" />
            )}
            <div className="history-info">
              <span className="history-food">{entry.food}</span>
              <span className="history-meta">
                {typeof entry.confidence === 'number' ? formatPercent(entry.confidence) : ''}
                {entry.ts ? ` · ${formatDate(entry.ts, lang)}` : ''}
              </span>
              <StatusChip status={entry.nutrition_status} />
            </div>
            <button
              type="button"
              className="history-del"
              aria-label={t('close')}
              onClick={() => onRemove(entry.id)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}