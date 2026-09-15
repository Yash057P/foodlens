export function formatLabel(food) {
  if (!food) return ''
  return food
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function formatPercent(confidence) {
  return `${(confidence * 100).toFixed(1)}%`
}

export function makeThumbnail(src, maxSize = 160) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.55))
      } catch {
        resolve('')
      }
    }
    img.onerror = () => resolve('')
    img.src = src
  })
}

export function formatDate(ts, lang) {
  const locale = lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'mr-IN'
  try {
    return new Date(ts).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(ts)
  }
}

export function translateServerMessage(message) {
  if (!message) return message
  if (message.includes('Uncertain')) return 'uncertainWarning'
  if (message.includes('empty')) return null
  if (message.includes('valid image')) return 'unsupportedType'
  if (message.includes('too large')) return 'fileTooLarge'
  if (message.includes('Cannot reach')) return 'cannotReach'
  return null
}