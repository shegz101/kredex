// Deterministic image fallback, ported from the original landing page.
// When an <img> fails to load, swap its source for a stable fallback chosen
// from this pool based on a hash of the original URL.
import type { SyntheticEvent } from 'react'

const FALLBACKS = [
  'https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/917d6f93-fb36-439a-8c48-884b67b35381_1600w.jpg',
  'https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/4734259a-bad7-422f-981e-ce01e79184f2_1600w.jpg',
  'https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/c543a9e1-f226-4ced-80b0-feb8445a75b9_1600w.jpg',
  'https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/5bab247f-35d9-400d-a82b-fd87cfe913d2_1600w.webp',
  'https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/30104e3c-5eea-4b93-93e9-5313698a7156_1600w.webp',
]

function pickFallback(src: string): string {
  let hash = 0
  for (let i = 0; i < src.length; i++) {
    hash = ((hash << 5) - hash + src.charCodeAt(i)) | 0
  }
  return FALLBACKS[Math.abs(hash) % FALLBACKS.length]
}

/** onError handler for <img> elements. */
export function handleImageError(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget
  if (img.dataset.fallbackApplied) return
  img.dataset.fallbackApplied = '1'
  img.src = pickFallback(img.src)
}
