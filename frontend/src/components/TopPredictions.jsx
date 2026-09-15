import { formatLabel, formatPercent } from '../utils'

export default function TopPredictions({ predictions }) {
  if (!predictions || predictions.length === 0) return null
  return (
    <section className="card top-card float-in">
      <ol className="top-list">
        {predictions.map((p, i) => (
          <li
            key={`${p.food}-${i}`}
            className={`top-item ${i === 0 ? 'primary' : ''}`}
            style={{ animationDelay: `${i * 110}ms` }}
          >
            <span className="top-name">{formatLabel(p.food)}</span>
            <span className="top-track">
              <span className="top-fill" style={{ '--w': `${Math.min(100, p.confidence * 100)}%` }} />
            </span>
            <span className="top-pct">{formatPercent(p.confidence)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}