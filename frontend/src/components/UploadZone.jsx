import { useRef, useState } from 'react'
import { useSettings } from '../SettingsContext'

const ACCEPT = 'image/jpeg,image/png,image/webp'

export default function UploadZone({ onFileSelected, onTakePhoto, disabled }) {
  const { t } = useSettings()
  const fileInputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFiles = (files) => {
    const file = files && files[0]
    if (!file) return
    if (invalidFile(file)) {
      onFileSelected(null, t('unsupportedType'))
      return
    }
    onFileSelected(file, null)
  }

  const invalidFile = (file) =>
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) &&
    !/\.(jpe?g|png|webp)$/i.test(file.name)

  const handleCameraClick = () => {
    if (disabled) return
    // Always open the in-app full-screen camera. On phones where
    // getUserMedia is unavailable (plain HTTP), CameraCapture falls back to
    // the native camera via capture=environment.
    onTakePhoto && onTakePhoto()
  }

  return (
    <section
      className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragActive(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
    >
      <div
        className="camera-btn"
        role="button"
        tabIndex={0}
        aria-label={t('cameraBtn')}
        onClick={handleCameraClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !disabled) handleCameraClick()
        }}
      >
        <svg
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 4h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2l2-3h6z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>

      <p className="upload-caption">{t('uploadTitle')}</p>
      <p className="upload-sub">{t('dragHint')}</p>
      <p className="upload-formats">{t('formats')}</p>

      <div className="zone-actions">
        <button
          type="button"
          className="btn btn-secondary btn-zone"
          disabled={disabled}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
          {t('uploadBtn')}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-zone"
          disabled={disabled}
          onClick={handleCameraClick}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          {t('cameraBtn')}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </section>
  )
}