import { useCallback, useEffect, useRef, useState } from 'react'
import { predictImage } from './api'
import { formatLabel, makeThumbnail, translateServerMessage } from './utils'
import { useSettings } from './SettingsContext'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import UploadZone from './components/UploadZone'
import ImagePreview from './components/ImagePreview'
import Results from './components/Results'
import WarningBanner from './components/WarningBanner'
import CameraCapture from './components/CameraCapture'
import Footer from './components/Footer'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import AboutPage from './pages/AboutPage'

const MAX_SIZE_BYTES = 10 * 1024 * 1024
const HISTORY_KEY = 'foodlens.history'

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function App() {
  const { t } = useSettings()
  const [page, setPage] = useState('scan')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [result, setResult] = useState(null)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [history, setHistory] = useState(loadHistory)
  const objectUrlRef = useRef(null)
  const cameraStreamRequestRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    } catch {}
  }, [history])

  const releasePreview = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  const handleFileSelected = useCallback(
    (selected, clientError) => {
      if (clientError) {
        setNotice(clientError)
        return
      }
      if (!selected) return
      if (selected.size > MAX_SIZE_BYTES) {
        setNotice(t('fileTooLarge'))
        return
      }
      releasePreview()
      const url = URL.createObjectURL(selected)
      objectUrlRef.current = url
      setFile(selected)
      setPreviewUrl(url)
      setNotice(null)
      setError(null)
      setResult(null)
      setStatus('idle')
    },
    [t]
  )

  const resetScan = useCallback(() => {
    releasePreview()
    setFile(null)
    setPreviewUrl(null)
    setResult(null)
    setError(null)
    setNotice(null)
    setStatus('idle')
  }, [])

  const openCamera = () => {
    // iOS Safari only shows the camera permission prompt if getUserMedia is
    // called synchronously inside the tap handler. Request the stream HERE
    // (still within the user gesture) and pass it to the camera UI.
    let streamRequest = null
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        streamRequest = navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      } catch {
        streamRequest = null
      }
    }
    cameraStreamRequestRef.current = streamRequest
    setCameraOpen(true)
  }

  const handleBack = () => {
    if (page !== 'scan') {
      setPage('scan')
    } else {
      resetScan()
    }
  }

  const handleAnalyze = async () => {
    if (!file || status === 'loading') return
    setStatus('loading')
    setError(null)
    setResult(null)
    try {
      const data = await predictImage(file)
      setResult(data)
      setStatus('success')
      const thumb = await makeThumbnail(previewUrl)
      const entry = {
        id: Date.now(),
        food: formatLabel(data.prediction && data.prediction.food),
        confidence: data.prediction && data.prediction.confidence,
        nutrition_status: data.nutrition_status,
        thumb,
        ts: Date.now(),
      }
      setHistory((prev) => [entry, ...prev].slice(0, 24))
    } catch (err) {
      const key = translateServerMessage(err.message)
      setError(key ? t(key) : err.message || t('genericError'))
      setStatus('error')
    }
  }

  const removeHistory = (id) => setHistory((prev) => prev.filter((h) => h.id !== id))
  const clearHistory = () => setHistory([])

  const hasSelection = Boolean(file)
  const showResults = result && status === 'success'

  const actionBar = page === 'scan' && (
    <>
      {hasSelection && !showResults && (
        <div className="action-bar">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleAnalyze}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? <span className="btn-loader" aria-hidden="true" /> : null}
            {status === 'loading' ? t('analyzing') : t('analyzeBtn')}
          </button>
        </div>
      )}
      {showResults && (
        <div className="action-bar">
          <button type="button" className="btn btn-secondary btn-lg" onClick={resetScan}>
            {t('scanAnother')}
          </button>
        </div>
      )}
    </>
  )

  return (
    <div className="app-shell">
      <span className="bg-blob blob-a" aria-hidden="true" />
      <span className="bg-blob blob-b" aria-hidden="true" />

      <Sidebar page={page} setPage={setPage} />

      <div className="phone-col">
        <div className="app">
          <TopBar page={page} setPage={setPage} onBack={handleBack} />
          <main className="main">
            {page === 'history' && (
              <HistoryPage history={history} onClear={clearHistory} onRemove={removeHistory} />
            )}

            {page === 'settings' && (
              <SettingsPage historyCount={history.length} onClearHistory={clearHistory} />
            )}

            {page === 'about' && <AboutPage />}

            {page === 'scan' && (
              <>
                {!hasSelection && (
                  <UploadZone
                    onFileSelected={handleFileSelected}
                    onTakePhoto={openCamera}
                    disabled={status === 'loading'}
                  />
                )}

                {hasSelection && (
                  <ImagePreview
                    previewUrl={previewUrl}
                    fileName={file.name}
                    loading={status === 'loading'}
                    onClear={resetScan}
                  />
                )}

                {notice && <WarningBanner message={notice} tone="error" />}
                {error && status === 'error' && <WarningBanner message={error} tone="error" />}
                {showResults && <Results result={result} />}
              </>
            )}
          </main>

          {actionBar}
          <Footer />
        </div>
      </div>

      {cameraOpen && (
        <CameraCapture
          streamRequest={cameraStreamRequestRef.current}
          onCapture={(captured) => {
            setCameraOpen(false)
            setPage('scan')
            handleFileSelected(captured, null)
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  )
}