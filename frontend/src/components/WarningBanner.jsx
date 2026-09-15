export default function WarningBanner({ message, tone = 'warning' }) {
  if (!message) return null
  return (
    <div role="alert" className={`banner banner-${tone} float-in`}>
      <span className="banner-dot" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}