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

  useEffect(() => {
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setState('error')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stopStream(stream)
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setState('live')
      } catch {
        setState('error')
      }
    }
    start()
    return () => {
      cancelled = true
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  const handleCapture = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d').drawImage(v, 0, 0)
    canvas.toBlob(
      (blob) => {
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
      <div className="camera-panel">
        <header className="camera-head">
          <h3>{t('cameraTitle')}</h3>
          <button type="button" className="camera-close" onClick={onClose} aria-label={t('close')}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
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
          <div className="camera-stage">
            <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
            <div className="camera-shutter-row">
              <button type="button" className="shutter" onClick={handleCapture} aria-label={t('capture')}>
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