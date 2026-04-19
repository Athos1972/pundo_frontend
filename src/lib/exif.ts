export interface GpsCoords {
  latitude: number
  longitude: number
}

async function fromGeolocation(): Promise<GpsCoords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => resolve(null),
      { timeout: 10_000, maximumAge: 60_000 },
    )
  })
}

/**
 * Extracts GPS coordinates from a photo file.
 * Tries EXIF data first (works for files from <input capture>),
 * falls back to the device Geolocation API (needed for WebRTC canvas captures
 * which have no EXIF).
 */
export async function extractGPS(file: File): Promise<GpsCoords | null> {
  try {
    const { gps } = await import('exifr')
    const result = await gps(file)
    if (result?.latitude != null && result?.longitude != null) {
      return { latitude: result.latitude, longitude: result.longitude }
    }
  } catch {
    // no EXIF or unsupported format — fall through
  }
  return fromGeolocation()
}
