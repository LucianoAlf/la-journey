import { useEffect, useMemo, useState } from 'react'
import { SpinnerGap, WarningCircle } from '@phosphor-icons/react'
import { lookupYouTubeVideo, extractYouTubeVideoId } from '@/services/youtubeLookupService'
import { youtubePlayerIframeAttrs, youtubePosterUrl } from '@/lib/youtubeEmbed'

interface YoutubePlayerProps {
  url: string
  thumbnailUrl?: string | null
  title?: string | null
}

export function YoutubePlayer({ url, thumbnailUrl, title }: YoutubePlayerProps) {
  const [state, setState] = useState<'loading' | 'ok' | 'blocked' | 'unknown'>('loading')
  const [playing, setPlaying] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const videoId = useMemo(() => extractYouTubeVideoId(url), [url])
  const poster = videoId ? youtubePosterUrl(videoId, thumbnailUrl) : ''
  const iframe = videoId ? youtubePlayerIframeAttrs(videoId, { autoplay: true }) : null

  useEffect(() => {
    setPlaying(false)
    if (!videoId) {
      setState('unknown')
      setMessage(null)
      return
    }
    let cancelled = false
    setState('loading')
    lookupYouTubeVideo(videoId)
      .then((result) => {
        if (cancelled) return
        if (result.ok) {
          setState('ok')
          setMessage(null)
          return
        }
        setState('blocked')
        setMessage(result.message)
      })
      .catch(() => {
        if (cancelled) return
        setState('unknown')
        setMessage(null)
      })
    return () => { cancelled = true }
  }, [videoId])

  if (!videoId) return null

  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3">
        Vídeo de referência
      </h3>
      {state === 'loading' && (
        <div className="flex items-center gap-2 text-[12px] text-text3 py-6 justify-center">
          <SpinnerGap size={14} className="animate-spin" />
          Conferindo se o vídeo toca no app…
        </div>
      )}
      {state === 'blocked' && (
        <>
          <p className="flex items-start gap-1.5 text-[12px] text-red-500 leading-snug rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">
            <WarningCircle size={15} className="shrink-0 mt-px" />
            {message ?? 'Esse vídeo não permite ser tocado fora do YouTube — escolha outro.'}
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block w-full overflow-hidden rounded-xl bg-black"
            style={{ paddingBottom: '56.25%' }}
          >
            <img
              src={poster}
              alt={title || 'YouTube'}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </a>
        </>
      )}
      {state !== 'loading' && state !== 'blocked' && !playing && (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="relative block w-full overflow-hidden rounded-xl bg-black text-left"
          style={{ paddingBottom: '56.25%' }}
        >
          <img
            src={poster}
            alt={title || 'YouTube'}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
            <span className="flex h-12 w-[68px] items-center justify-center rounded-lg bg-[#ff0000]">
              <span
                className="ml-0.5 block"
                style={{
                  width: 0,
                  height: 0,
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  borderLeft: '14px solid #fff',
                }}
              />
            </span>
          </span>
        </button>
      )}
      {playing && iframe && (state === 'ok' || state === 'unknown') && (
        <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute inset-0 h-full w-full border-0"
            src={iframe.src}
            title={title || 'YouTube video player'}
            allow={iframe.allow}
            referrerPolicy={iframe.referrerpolicy}
            allowFullScreen
          />
        </div>
      )}
    </div>
  )
}
