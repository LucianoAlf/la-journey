import { useEffect, useRef, useState } from 'react'
import { WarningCircle, SpinnerGap } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { lookupYouTubeVideo, YoutubeLookupError, extractYouTubeVideoId, type YoutubeVideoHit } from '@/services/youtubeLookupService'

const DEBOUNCE_MS = 600

interface YoutubeUrlFieldProps {
  value: string
  onChange: (value: string) => void
  onResolved?: (video: YoutubeVideoHit | null) => void
  disabled?: boolean
}

export function YoutubeUrlField({ value, onChange, onResolved, disabled }: YoutubeUrlFieldProps) {
  const [warning, setWarning] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const onResolvedRef = useRef(onResolved)
  onResolvedRef.current = onResolved

  useEffect(() => {
    const videoId = extractYouTubeVideoId(value)
    if (!value.trim()) {
      setWarning(null)
      setChecking(false)
      onResolvedRef.current?.(null)
      return
    }
    if (!videoId) {
      setWarning(null)
      setChecking(false)
      return
    }

    setChecking(true)
    const timer = window.setTimeout(() => {
      lookupYouTubeVideo(videoId)
        .then((result) => {
          setWarning(result.ok ? null : result.message)
          onResolvedRef.current?.(result.ok ? result.video : null)
        })
        .catch((error) => {
          setWarning(error instanceof YoutubeLookupError ? error.message : 'Não foi possível validar o vídeo agora.')
        })
        .finally(() => setChecking(false))
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [value])

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="h-9 text-[13px] font-mono"
          disabled={disabled}
        />
        {checking && (
          <SpinnerGap size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-text3" />
        )}
      </div>
      {warning && (
        <p className="flex items-start gap-1.5 text-[11px] text-red-500 leading-snug">
          <WarningCircle size={14} className="shrink-0 mt-px" />
          {warning}
        </p>
      )}
    </div>
  )
}
