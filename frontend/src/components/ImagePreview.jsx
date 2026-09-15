import { useSettings } from '../SettingsContext'

export default function ImagePreview({ previewUrl, fileName, loading, onClear }) {
  const { t } = useSettings()

  return (
    <section className="preview-card float-in">
      <div className={`preview-frame ${loading ? 'is-analyzing' : ''}`}>
        <img src={previewUrl} alt="Selected food preview" className="preview-image" />
        {loading && (
          <div className="preview-overlay">
            <span className="scan-line" aria-hidden="true" />
            <span className="spinner" aria-hidden="true" />
            <p>{t('analyzing')}</p>
          </div>
        )}
      </div>
      <div className="preview-meta">
        <span className="preview-filename" title={fileName}>
          {fileName}
        </span>
        <button type="button" className="btn btn-ghost" onClick={onClear} disabled={loading}>
          {t('retake')}
        </button>
      </div>
    </section>
  )
}