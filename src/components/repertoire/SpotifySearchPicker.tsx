import { useState } from 'react'
import { MagnifyingGlass, SpinnerGap, SpotifyLogo } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { searchSpotifyTracks, type SpotifyTrackHit } from '@/services/repertoireService'

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`
}

function coverThumb(track: SpotifyTrackHit): string | null {
  if (!track.images.length) return null
  return track.images[track.images.length - 1]?.url ?? track.images[0].url
}

interface SpotifySearchPickerProps {
  title: string
  artist: string
  disabled?: boolean
  onPick: (track: SpotifyTrackHit) => void
}

export function SpotifySearchPicker({ title, artist, disabled, onPick }: SpotifySearchPickerProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tracks, setTracks] = useState<SpotifyTrackHit[]>([])
  const [empty, setEmpty] = useState(false)

  async function handleSearch() {
    if (!title.trim()) {
      toast.error('Preencha o título da música antes de buscar no Spotify')
      return
    }

    setLoading(true)
    setEmpty(false)
    setTracks([])
    setOpen(true)

    try {
      const results = await searchSpotifyTracks(title, artist)
      setTracks(results)
      setEmpty(results.length === 0)
    } catch (error) {
      setOpen(false)
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar no Spotify')
    } finally {
      setLoading(false)
    }
  }

  function handlePick(track: SpotifyTrackHit) {
    onPick(track)
    setOpen(false)
    toast.success(`Spotify: ${track.name} — ${track.artist}`)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 gap-1.5 text-[11px]"
        onClick={handleSearch}
        disabled={disabled || loading}
      >
        {loading ? <SpinnerGap size={14} className="animate-spin" /> : <MagnifyingGlass size={14} />}
        Buscar no Spotify
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-[16px]">
              <SpotifyLogo size={18} weight="fill" className="text-green-500" />
              Confirme a faixa
            </DialogTitle>
            <p className="text-[12px] text-text3 pt-1">
              {title}{artist ? ` · ${artist}` : ''}. Escolha a original — karaokê e cover ficam na lista.
            </p>
          </DialogHeader>

          <div className="px-3 py-2 max-h-[420px] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-10 text-text3 text-sm">
                <SpinnerGap size={16} className="animate-spin" />
                Buscando no Spotify…
              </div>
            )}

            {!loading && empty && (
              <p className="px-2 py-8 text-center text-sm text-text3">
                Nenhuma faixa encontrada. Cole a URL do Spotify na mão.
              </p>
            )}

            {!loading && tracks.map((track) => {
              const thumb = coverThumb(track)
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => handlePick(track)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-[var(--azul-soft)] transition-colors"
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 shrink-0 rounded-sm bg-black object-contain"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-sm bg-border" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-text truncate">{track.name}</div>
                    <div className="text-[12px] text-text2 truncate">{track.artist}</div>
                    <div className="text-[11px] text-text3 truncate">
                      {track.album}
                      {track.year ? ` · ${track.year}` : ''}
                      {track.duration_ms ? ` · ${formatDuration(track.duration_ms)}` : ''}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
