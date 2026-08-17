import { useEffect } from 'react'
import { StudySheetFrame } from '@/components/estudo/StudySheetFrame'
import { StudyPlayalongSurface } from '@/components/music/StudyPlayalongSurface'
import { ESTUDO_PRINTVIEW_PAGE_CSS } from '@/lib/estudoPdf'
import type { EstudoPrintModel } from '@/lib/estudoPrint'

export function EstudoPrintDocument({
  model,
  onRendered,
}: {
  model: EstudoPrintModel
  onRendered: () => void
}) {
  useEffect(() => {
    const root = document.documentElement
    const previousTheme = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    root.classList.remove('dark')
    return () => {
      if (previousTheme) root.setAttribute('data-theme', previousTheme)
    }
  }, [])

  return (
    <main className="print-view estudo-print-view" data-print-root data-page-orientation="landscape">
      <style>{ESTUDO_PRINTVIEW_PAGE_CSS}</style>
      <section className="a4-page print-page a4-page--landscape estudo-print-page">
        <div className="a4-page-content print-page-content">
          <StudySheetFrame
            schoolName={model.schoolName}
            logoUrl={model.schoolLogoUrl}
            title={model.title}
            curatorName={model.curatorName}
            onTitleCommit={() => undefined}
          >
            <StudyPlayalongSurface
              tex={model.tex}
              barsPerRow={model.barsPerSystem}
              indexMap={model.indexMap}
              displayMode={model.estudo.displayMode}
              audioUrl={null}
              syncPoints={[]}
              marking={false}
              interactive={false}
              onRendered={onRendered}
            />
          </StudySheetFrame>
        </div>
      </section>
    </main>
  )
}
