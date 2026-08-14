import { forwardRef } from 'react'
import { MaterialPreview } from '@/components/material/MaterialPreview'
import type { RepertoirePdfCover } from '@/lib/repertoirePdfCover'

export const PrintableCover = forwardRef<HTMLDivElement, { cover: RepertoirePdfCover }>(
  ({ cover }, ref) => (
    <div
      ref={ref}
      data-theme="light"
      className="a4-page a4-page--cover repertoire-pdf-cover"
      style={{
        width: '794px',
        height: '1123px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        position: 'relative',
      }}
    >
      <MaterialPreview
        blocks={[{
          block_type: 'cover',
          title: cover.title,
          render_data: cover.renderData,
        }]}
      />
    </div>
  ),
)

PrintableCover.displayName = 'PrintableCover'
