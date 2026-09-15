const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export async function predictImage(file) {
  const formData = new FormData()
  formData.append('file', file)

  let res
  try {
    res = await fetch(`${API_BASE}/api/predict`, {
      method: 'POST',
      body: formData,
    })
  } catch (err) {
    throw new Error(
      'Cannot reach the FoodLens backend. Make sure the API server is running.'
    )
  }

  if (!res.ok) {
    let detail = `Request failed (HTTP ${res.status})`
    try {
      const body = await res.json()
      if (body && typeof body.detail === 'string') detail = body.detail
    } catch {
      // keep the generic message
    }
    throw new Error(detail)
  }

  try {
    return await res.json()
  } catch {
    throw new Error('The backend returned an unreadable response.')
  }
}