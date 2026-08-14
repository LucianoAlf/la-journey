import { useState } from 'react'
import { MagnifyingGlass, SpinnerGap, YoutubeLogo } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { searchYouTubeVideos, type YoutubeVideoHit } from '@/services/youtubeLookupService'

interface YoutubeSearchPickerProps {
  title: string
  artist: string
  disabled?: boolean
  onPick: (video: YoutubeVideoHit) => void
}

export function YoutubeSearchPicker({ title, artist, disabled, onPick }: YoutubeSearchPickerProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [videos, setVideos] = useState<YoutubeVideoHit[]>([])
  const [empty, setEmpty] = useState(false)

  async function handleSearch() {
    if (!title.trim()) {
      toast.error('Preencha o título da música antes de buscar no YouTube')
      return
    }

    setLoading(true)
    setEmpty(false)
    setVideos([])
    setOpen(true)

    try {
      const results = await searchYouTubeVideos(title, artist)
      setVideos(results)
      setEmpty(results.length === 0)
    } catch (error) {
      setOpen(false)
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar no YouTube')
    } finally {
      setLoading(false)
    }
  }

  function handlePick(video: YoutubeVideoHit) {
    onPick(video)
    setOpen(false)
    toast.success(`YouTube: ${video.title}`)
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
        Buscar no YouTube
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-[16px]">
              <YoutubeLogo size={18} weight="fill" className="text-red-500" />
              Confirme o vídeo
            </DialogTitle>
            <p className="text-[12px] text-text3 pt-1">
              {title}{artist ? ` · ${artist}` : ''}. Escolha o clipe oficial — aula, karaokê e cover ficam na lista.
            </p>
          </DialogHeader>

          <div className="px-3 py-2 max-h-[420px] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-10 text-text3 text-sm">
                <SpinnerGap size={16} className="animate-spin" />
                Buscando no YouTube…
              </div>
            )}

            {!loading && empty && (
              <p className="px-2 py-8 text-center text-sm text-text3">
                Nenhum vídeo encontrado. Cole a URL do YouTube na mão.
              </p>
            )}

            {!loading && videos.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => handlePick(video)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-[var(--azul-soft)] transition-colors"
              >
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt=""
                    width={64}
                    height={36}
                    className="h-9 w-16 shrink-0 rounded-sm bg-black object-contain"
                  />
                ) : (
                  <div className="h-9 w-16 shrink-0 rounded-sm bg-border" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-text truncate">{video.title}</div>
                  <div className="text-[12px] text-text2 truncate">{video.channel}</div>
                  <div className="text-[11px] text-text3 truncate">{video.duration}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
