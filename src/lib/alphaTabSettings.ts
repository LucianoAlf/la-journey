import * as alphaTabModule from '@coderline/alphatab'

export type AlphaTabPurpose =
  | 'editor-notation-score'
  | 'editor-notation-grand-staff'
  | 'editor-tablature-tab'
  | 'canvas-notation-score'
  | 'canvas-rhythm-score'
  | 'canvas-tablature-tab'
  | 'snapshot-notation'
  | 'snapshot-rhythm'
  | 'snapshot-tablature'

export interface BuildAlphaTabSettingsOptions {
  purpose: AlphaTabPurpose
  showTimeSignature?: boolean
  layout?: 'horizontal' | 'page'
  scale?: number
  includeNoteBounds?: boolean
  systemPaddingBottom?: number
}

function isTabPurpose(purpose: AlphaTabPurpose) {
  return purpose === 'editor-tablature-tab'
    || purpose === 'canvas-tablature-tab'
    || purpose === 'snapshot-tablature'
}

function isSnapshotPurpose(purpose: AlphaTabPurpose) {
  return purpose.startsWith('snapshot-')
}

function isEditorPurpose(purpose: AlphaTabPurpose) {
  return purpose.startsWith('editor-')
}

function getFontDirectory() {
  if (typeof window === 'undefined') return '/font/'
  return `${window.location.origin}/font/`
}

function applyNotationElements(
  settings: alphaTabModule.Settings,
  {
    isScoreMode,
    isTab,
    showTimeSignature,
  }: {
    isScoreMode: boolean
    isTab: boolean
    showTimeSignature: boolean
  },
) {
  const NE = alphaTabModule.NotationElement
  const elements = settings.notation.elements

  elements.set(NE.ScoreTitle, false)
  elements.set(NE.ScoreSubTitle, false)
  elements.set(NE.ScoreArtist, false)
  elements.set(NE.ScoreAlbum, false)
  elements.set(NE.ScoreWords, false)
  elements.set(NE.ScoreMusic, false)
  elements.set(NE.ScoreWordsAndMusic, false)
  elements.set(NE.ScoreCopyright, false)
  elements.set(NE.GuitarTuning, false)
  elements.set(NE.TrackNames, false)
  elements.set(NE.EffectTempo, false)
  elements.set(NE.EffectDynamics, false)
  elements.set(NE.EffectPickStroke, true)
  elements.set(NE.EffectCrescendo, false)
  elements.set(NE.EffectFreeTime, false)
  elements.set(NE.BarNumber, isScoreMode && showTimeSignature)
}

function applyThemeResources(
  settings: alphaTabModule.Settings,
  showTimeSignature: boolean,
) {
  if (typeof document === 'undefined') return

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    || document.documentElement.classList.contains('dark')
  const res = settings.display.resources

  res.barSeparatorColor = showTimeSignature
    ? isDark
      ? new alphaTabModule.model.Color(120, 130, 150, 200)
      : new alphaTabModule.model.Color(148, 163, 184, 220)
    : new alphaTabModule.model.Color(0, 0, 0, 0)

  if (isDark) {
    res.mainGlyphColor = new alphaTabModule.model.Color(220, 225, 235, 255)
    res.secondaryGlyphColor = new alphaTabModule.model.Color(150, 160, 180, 255)
    res.staffLineColor = new alphaTabModule.model.Color(80, 90, 110, 255)
    res.scoreInfoColor = new alphaTabModule.model.Color(200, 210, 225, 255)
  } else {
    res.mainGlyphColor = new alphaTabModule.model.Color(30, 30, 40, 255)
    res.secondaryGlyphColor = new alphaTabModule.model.Color(100, 100, 120, 255)
    res.staffLineColor = new alphaTabModule.model.Color(55, 58, 64, 255)
    res.scoreInfoColor = new alphaTabModule.model.Color(40, 40, 55, 255)
  }
}

export function buildAlphaTabSettings({
  purpose,
  showTimeSignature = false,
  layout = 'page',
  scale = 0.8,
  includeNoteBounds = false,
  systemPaddingBottom,
}: BuildAlphaTabSettingsOptions): alphaTabModule.Settings {
  const settings = new alphaTabModule.Settings()
  const isTab = isTabPurpose(purpose)
  const effectiveLayout = isTab ? 'horizontal' : layout
  const effectiveScale = isTab ? 0.9 : scale
  const isHorizontalLayout = effectiveLayout === 'horizontal'
  const isScoreMode = !isTab
  const isGrandStaff = purpose === 'editor-notation-grand-staff'

  settings.core.fontDirectory = getFontDirectory()
  settings.core.tex = true
  settings.core.includeNoteBounds = includeNoteBounds
  settings.core.enableLazyLoading = isEditorPurpose(purpose) && !isSnapshotPurpose(purpose)

  settings.display.layoutMode = isHorizontalLayout
    ? alphaTabModule.LayoutMode.Horizontal
    : alphaTabModule.LayoutMode.Page
  settings.display.scale = effectiveScale
  settings.display.systemPaddingBottom = systemPaddingBottom ?? (isHorizontalLayout ? 0 : 20)
  const stretchForce = isHorizontalLayout
    ? (showTimeSignature ? 0.75 : 1.05)
    : (showTimeSignature ? 1.8 : 3.5)
  settings.display.stretchForce = isTab ? 1.0 : stretchForce
  settings.display.justifyLastSystem = !isHorizontalLayout
  settings.display.staveProfile = isTab
    ? alphaTabModule.StaveProfile.Tab
    : alphaTabModule.StaveProfile.Score

  settings.player.enablePlayer = false
  settings.player.enableCursor = false

  settings.notation.rhythmMode = alphaTabModule.TabRhythmMode.ShowWithBars
  settings.notation.notationMode = (isTab || isGrandStaff)
    ? alphaTabModule.NotationMode.GuitarPro
    : alphaTabModule.NotationMode.SongBook

  applyNotationElements(settings, { isScoreMode, isTab, showTimeSignature })
  applyThemeResources(settings, showTimeSignature)

  return settings
}
