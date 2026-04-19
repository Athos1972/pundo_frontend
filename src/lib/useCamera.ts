'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type FacingMode = 'environment' | 'user'

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  isSupported: boolean
  isActive: boolean
  facingMode: FacingMode
  error: string | null
  start: (facing?: FacingMode) => Promise<void>
  stop: () => void
  flip: () => void
  capture: () => File | null
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [error, setError] = useState<string | null>(null)

  const isSupported =
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsActive(false)
  }, [])

  const start = useCallback(async (facing: FacingMode = 'environment') => {
    stop()
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setFacingMode(facing)
      setIsActive(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'camera_error'
      setError(msg.includes('Permission') || msg.includes('NotAllowed') ? 'denied' : 'unavailable')
    }
  }, [stop])

  const flip = useCallback(() => {
    const next: FacingMode = facingMode === 'environment' ? 'user' : 'environment'
    start(next)
  }, [facingMode, start])

  const capture = useCallback((): File | null => {
    const video = videoRef.current
    if (!video || !isActive) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    // canvas.toBlob is async — we use toDataURL + convert synchronously here
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const arr = dataUrl.split(',')
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    const u8arr = new Uint8Array(bstr.length)
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i)
    return new File([u8arr], `spotted_${Date.now()}.jpg`, { type: mime })
  }, [isActive])

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop])

  return { videoRef, isSupported, isActive, facingMode, error, start, stop, flip, capture }
}
