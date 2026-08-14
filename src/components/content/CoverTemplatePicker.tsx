import { useEffect, useState } from 'react'
import { COVER_TEMPLATES, type CoverTemplate } from '@/lib/notebookMaterialAssembler'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const LABELS: Record<CoverTemplate, string> = {
  modern: 'Modern',
  elegant: 'Elegant',
  colorful: 'Colorful',
  bold: 'Bold',
  classic: 'Classic',
  minimal: 'Minimal',
}

interface LibraryImage {
  id: string
  image_url: string
  label: string | null
}

export function CoverTemplatePicker({
  schoolId,
  template,
  imageUrl,
  onTemplateChange,
  onImageUrlChange,
}: {
  schoolId?: string
  template: CoverTemplate
  imageUrl: string | null
  onTemplateChange: (template: CoverTemplate) => void
  onImageUrlChange: (url: string | null) => void
}) {
  const [images, setImages] = useState<LibraryImage[]>([])

  useEffect(() => {
    if (!schoolId) return

    let cancelled = false

    const load = async () => {
      const { data } = await supabase
        .from('image_library' as any)
        .select('id, image_url, label')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(12)

      if (cancelled) return
      const rows = ((data ?? []) as unknown as LibraryImage[]).filter((row) => row.image_url)
      setImages(rows)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [schoolId])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {COVER_TEMPLATES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onTemplateChange(value)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
              template === value
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border bg-background text-text2 hover:border-accent/40',
            )}
          >
            {LABELS[value]}
          </button>
        ))}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-6 gap-1.5">
          {images.map((image) => {
            const selected = imageUrl === image.image_url
            return (
              <button
                key={image.id}
                type="button"
                title={image.label ?? undefined}
                onClick={() => onImageUrlChange(selected ? null : image.image_url)}
                className={cn(
                  'aspect-square overflow-hidden rounded-md border bg-background',
                  selected ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-accent/40',
                )}
              >
                <img
                  src={image.image_url}
                  alt={image.label ?? ''}
                  className="h-full w-full object-cover"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
