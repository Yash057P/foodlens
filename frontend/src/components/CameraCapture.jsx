import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../SettingsContext'

function stopStream(stream) {
  if (!stream) return
  stream.getTracks().forEach((track) => track.stop())
}

const GRANT_TIMEOUT_MS = 9000

export default function CameraCapture({ onCapture, onClose }) {
  const { t } = useSettings()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fallbackRef = useRef(null)
  const attachRef = useRef(false)
  const deniedRef = useRef(false)
  const [state, setState] = useState('starting') // starting | live | error
  const [facing, setFacing] = useState('environment')

  const attachStream = (stream) => {
    const v = videoRef.current
    if (!v || !stream) return
    v.srcObject = stream
    v.play().catch(() => {})
  }

  useEffect(() => {
    let cancelled = false
    let grantTimer = null

    async function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!cancelled) setState('error')
        return
      }

      setState('starting')
      stopStream(streamRef.current)
      streamRef.current = null
      attachRef.current = false

      grantTimer = setTimeout(() => {
        if (!cancelled) setState('error')
      }, GRANT_TIMEOUT_MS)

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        })
        clearTimeout(grantTimer)
        if (cancelled) {
          stopStream(stream)
          return
        }
        streamRef.current = stream
        attachRef.current = false
        setState('live')
      } catch {
        clearTimeout(grantTimer)
        deniedRef.current = true
        if (!cancelled) setState('error')
      }
    }

    start()
    return () => {
      cancelled = true
      if (grantTimer) clearTimeout(grantTimer)
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [facing])

  // Attach the stream once the viewfinder is live and the video element exists
  useEffect(() => {
    if (state === 'live' && streamRef.current && videoRef.current && !attachRef.current) {
      attachStream(streamRef.current)
      attachRef.current = true
    }
  }, [state])

  // Some browsers drop the play request; retry on canplay / user tap
  const ensurePlaying = () => {
    const v = videoRef.current
    if (!v || !streamRef.current) return
    if (v.paused) v.play().catch(() => {})
  }

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
      <div className={`camera-panel ${state === 'live' ? 'camera-panel-live' : ''}`}>
        <header className="camera-head">
          <button
            type="button"
            className="camera-icon-btn"
            onClick={onClose}
            aria-label={t('close')}
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
            onClick={() => {
              setFacing((f) => (f === 'environment' ? 'user' : 'environment'))
            }}
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

        <div className="camera-stage" onClick={state === 'live' ? handleCapture : ensurePlaying}>
          {/* Video is ALWAYS rendered so refs exist when stream arrives */}
          <video
            ref={videoRef}
            className={`camera-video ${state !== 'live' ? 'camera-video-hidden' : ''}`}
            autoPlay
            playsInline
            muted
            onCanPlay={ensurePlaying}
            onClick={(e) => {
              e.stopPropagation()
              if (state === 'live') handleCapture()
            }}
          />

          {state === 'live' && <div className="camera-hint">{t('tapToCapture')}</div>}

          {state === 'live' && (
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
          )}

          {state === 'starting' && (
            <div className="camera-overlay-msg">
              <span className="spinner" aria-hidden="true" />
              <p>{t('cameraStarting')}…</p>
            </div>
          )}

          {state === 'error' && (
            <div className="camera-overlay-msg">
              <p className="camera-error">
                {deniedRef.current ? t('cameraDenied') : t('cameraUnavailable')}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fallbackRef.current && fallbackRef.current.click()}
              >
                {t('cameraBtn')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                {t('close')}
              </button>
            </div>
          )}
        </div>

        {/* No capture attr: Android shows the system sheet with Camera + Gallery + Files */}
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