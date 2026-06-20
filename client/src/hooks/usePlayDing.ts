import { useCallback, useRef } from 'react'

const DING_SRC = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'

/**
 * Returns a function that plays a subtle "ding" interaction sound.
 * Mirrors the original landing page's hover sound effect.
 */
export function usePlayDing() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  if (!audioRef.current && typeof Audio !== 'undefined') {
    const audio = new Audio(DING_SRC)
    audio.preload = 'auto'
    audioRef.current = audio
  }

  return useCallback(() => {
    const sound = audioRef.current
    if (!sound) return
    sound.currentTime = 0
    sound.volume = 0.15 // Kept subtle
    sound.play().catch(() => {}) // Catch browsers blocking autoplay
  }, [])
}
