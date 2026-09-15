import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../SettingsContext'

function stopStream(stream) {
  if (!stream) return
  stream.getTracks().forEach((track) => track.stop())
}

export default function CameraCapture({ onCapture, onClose }) {
  const { t } = useSettings()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fallbackRef = useRef(null)
  const [state, setState] = useState('starting') // starting | live | error
  const [facing, setFacing] = useState('environment')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setState('error')
        return
      }
      setState('starting')
      stopStream(streamRef.current)
      streamRef.current = null
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        if (cancelled) {
          stopStream(stream)
          return
        }
        streamRef.current = stream
        const v = videoRef.current
        if (!v) {
          stopStream(stream)
          return
        }
        v.srcObject = stream
        await new Promise((resolve) => {
          let done = false
          const onMeta = () => {
            done = true
            v.removeEventListener('loadedmetadata', onMeta)
            resolve()
          }
          v.addEventListener('loadedmetadata', onMeta)
          setTimeout(() => {
            if (!done) resolve()
          }, 2500)
        })
        await v.play().catch(() => {})
        if (!cancelled) setState('live')
      } catch {
        if (!cancelled) setState('error')
      }
    }

    start()
    return () => {
      cancelled = true
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [facing])

  const handleCapture = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth || busy) return
    setBusy(true)
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d').drawImage(v, 0, 0)
    canvas.toBlob(
      (blob) => {
        setBusy(false)
        if (!blob) return
        const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
      },
      'image/jpeg',
      0.92
    )
  }

  return (
    <div className="camera-modal" role="dialog" aria-modal="true" aria-label={t('cameraTitle')}>
      <div className={`camera-panel ${state === 'live' ? 'camera-panel-live' : ''}`}>
        <header className="camera-head">
          <button
            type="button"
            className="camera-icon-btn"
            onClick={onClose}
            aria-label={t('close')}
            disabled={state === 'starting'}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <h3>{t('cameraTitle')}</h3>

          <button
            type="button"
            className="camera-icon-btn"
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            aria-label={t('switchCamera')}
            disabled={state !== 'live'}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </svg>
          </button>
        </header>

        {state === 'starting' && (
          <div className="camera-stage camera-stage-message">
            <span className="spinner" aria-hidden="true" />
            <p>{t('analyzing')}…</p>
          </div>
        )}

        {state === 'live' && (
          <div className="camera-stage" onClick={handleCapture} role="button" tabIndex={0}>
            <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
            <div className="camera-hint">{t('tapToCapture')}</div>
            <div className="camera-shutter-row">
              <button
                type="button"
                className="shutter"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCapture()
                }}
                aria-label={t('capture')}
              >
                <span />
              </button>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="camera-stage camera-stage-message">
            <p className="camera-error">{t('cameraDenied')}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => fallbackRef.current && fallbackRef.current.click()}
            >
              {t('uploadBtn')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('close')}
            </button>
          </div>
        )}

        <input
          ref={fallbackRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const file = e.target.files && e.target.files[0]
            if (file) onCapture(file)
          }}
        />
      </div>
    </div>
  )
}