import {
  applySelectionColor,
  beatBodyHitIndex,
  collectNoteHeadsFromBeat,
  glyphHitsNoteHead,
  insertAfterFromBeatRects,
  resolveInsertAfterIndex,
  resolveModelBeatIndex,
  resolveStaffClick,
} from '../notationBeatHit.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('maps alphaTab index through indexMap', () => {
  const indexMap = [0, 0, 1, 2]
  assert(resolveModelBeatIndex(0, indexMap) === 0, 'grace shares 0')
  assert(resolveModelBeatIndex(1, indexMap) === 0, 'grace extra')
  assert(resolveModelBeatIndex(2, indexMap) === 1, 'second model beat')
})

test('out of range returns -1', () => {
  assert(resolveModelBeatIndex(-1, [0]) === -1, 'negative')
  assert(resolveModelBeatIndex(4, [0, 1]) === -1, 'past end')
})

test('click on existing beat selects that model index', () => {
  assert(resolveInsertAfterIndex(2, true) === 2, 'on beat → that index for select/replace')
})

test('click on empty staff after a beat inserts after it', () => {
  assert(resolveInsertAfterIndex(2, false) === 2, 'empty after beat 2 → insert after 2')
})

test('click with no beat uses -1 so insert goes to the end', () => {
  assert(resolveInsertAfterIndex(-1, false) === -1, 'no hit')
})

test('click on a note always selects, armed or not (MuseScore/Finale)', () => {
  const armed = resolveStaffClick({ armed: true, noteHitIndex: 2, insertAfterIndex: 2 })
  assert(armed.type === 'select' && armed.index === 2, 'armed selects, never replaces')
  const disarmed = resolveStaffClick({ armed: false, noteHitIndex: 2, insertAfterIndex: 2 })
  assert(disarmed.type === 'select' && disarmed.index === 2, 'disarmed selects')
})

test('beat body hit counts as a note click', () => {
  const armed = resolveStaffClick({ armed: true, noteHitIndex: -1, beatHitIndex: 3, insertAfterIndex: 3 })
  assert(armed.type === 'select' && armed.index === 3, 'armed beat-body selects')
  const disarmed = resolveStaffClick({ armed: false, noteHitIndex: -1, beatHitIndex: 3, insertAfterIndex: 3 })
  assert(disarmed.type === 'select' && disarmed.index === 3, 'disarmed beat-body selects')
})

test('armed click on empty staff inserts after the beat to the left', () => {
  const action = resolveStaffClick({ armed: true, noteHitIndex: -1, insertAfterIndex: 1 })
  assert(action.type === 'insert' && action.afterIndex === 1, 'insert')
})

test('disarmed click on empty staff releases the selection', () => {
  assert(resolveStaffClick({ armed: false, noteHitIndex: -1, insertAfterIndex: 1 }).type === 'clear', 'clear')
})

test('beatBodyHitIndex hits the whole beat column with slack', () => {
  const rects = [{ x: 100, y: 50, w: 20, h: 30 }]
  assert(beatBodyHitIndex(rects, [0], 110, 65) === 0, 'center hits')
  assert(beatBodyHitIndex(rects, [0], 130, 90) === 0, 'slack around the beat still hits')
  assert(beatBodyHitIndex(rects, [0], 170, 65) === -1, 'far away misses')
})

test('beatBodyHitIndex picks the nearer beat when a gap overlaps two columns', () => {
  // Dó5 (x 505) e a nota à direita (x 570): um clique no meio do vão pega a mais perto.
  const rects = [
    { x: 505, y: 216, w: 14, h: 49 },
    { x: 570, y: 216, w: 14, h: 49 },
  ]
  assert(beatBodyHitIndex(rects, [0, 1], 537, 192) === 0, 'closer to the left beat wins')
  assert(beatBodyHitIndex(rects, [0, 1], 560, 192) === 1, 'closer to the right beat wins')
})

test('beatBodyHitIndex catches a note head above the staff band (C5 case)', () => {
  // Bounds do alphaTab só cobrem a pauta (y 216-264); a cabeça do C5 fica ~15px acima.
  const rects = [{ x: 505, y: 216, w: 14, h: 49 }]
  assert(beatBodyHitIndex(rects, [0], 506, 201) === 0, 'head above staff still hits')
  assert(beatBodyHitIndex(rects, [0], 527, 192) === 0, 'head above staff with haste slack hits')
  assert(beatBodyHitIndex(rects, [0], 506, 150) === -1, 'too far above misses')
})

test('beatBodyHitIndex prefers the nearest system when columns align', () => {
  const rects = [
    { x: 100, y: 50, w: 20, h: 30 },
    { x: 100, y: 200, w: 20, h: 30 },
  ]
  assert(beatBodyHitIndex(rects, [0, 1], 110, 45) === 0, 'above system 1 hits system 1')
  assert(beatBodyHitIndex(rects, [0, 1], 110, 195) === 1, 'above system 2 hits system 2')
})

test('insertAfterFromBeatRects uses the last beat whose center is left of the click', () => {
  const rects = [
    { x: 0, y: 50, w: 20, h: 30 },
    { x: 40, y: 50, w: 20, h: 30 },
    { x: 80, y: 50, w: 20, h: 30 },
  ]
  assert(insertAfterFromBeatRects(rects, [0, 1, 2], 55, 65) === 1, 'between 1 and 2')
  assert(insertAfterFromBeatRects(rects, [0, 1, 2], 10, 65) === 0, 'over first')
  assert(insertAfterFromBeatRects(rects, [0, 1, 2], 0, 65) === -1, 'before first')
})

test('insertAfterFromBeatRects only looks at beats in the clicked system', () => {
  const rects = [
    { x: 100, y: 50, w: 20, h: 30 },   // sistema 1, beat 0
    { x: 300, y: 50, w: 20, h: 30 },   // sistema 1, beat 1
    { x: 50, y: 200, w: 20, h: 30 },   // sistema 2, beat 2
    { x: 250, y: 200, w: 20, h: 30 },  // sistema 2, beat 3
  ]
  const map = [0, 1, 2, 3]
  // Clique num vão do sistema 1 não pode "ver" os X menores do sistema 2.
  assert(insertAfterFromBeatRects(rects, map, 200, 65) === 0, 'gap in system 1 → after beat 0')
  assert(insertAfterFromBeatRects(rects, map, 200, 215) === 2, 'gap in system 2 → after beat 2')
  // À esquerda do primeiro beat do sistema 2 → depois do último do sistema 1.
  assert(insertAfterFromBeatRects(rects, map, 20, 215) === 1, 'start of system 2 → after last of system 1')
})

test('collectNoteHeadsFromBeat reads noteHeadBounds, not the staff column', () => {
  const heads = collectNoteHeadsFromBeat({
    visualBounds: { x: 100, y: 50, w: 14, h: 48 },
    notes: [{ noteHeadBounds: { x: 102, y: 88, w: 10, h: 8 } }],
  })
  assert(heads.length === 1, 'one head')
  assert(heads[0].y === 88, 'head sits on the note, not the staff band')
  assert(collectNoteHeadsFromBeat({ visualBounds: { x: 40, y: 10, w: 8, h: 48 } }).length === 0, 'coluna do beat não é cabeça')
})

test('applySelectionColor paints only the selected beat in the score model', () => {
  const noteStyle = { id: 'note' }
  const beatStyle = { id: 'beat' }
  const beats = [
    { notes: [{ style: null as object | null }], style: null as object | null },
    { notes: [{ style: null as object | null }], style: null as object | null },
  ]
  applySelectionColor(beats, 1, { note: noteStyle, beat: beatStyle })
  assert(beats[0].style === null && beats[0].notes[0].style === null, 'unselected stays default')
  assert(beats[1].style === beatStyle && beats[1].notes[0].style === noteStyle, 'selected note+stem')
  applySelectionColor(beats, -1, { note: noteStyle, beat: beatStyle })
  assert(beats[1].style === null && beats[1].notes[0].style === null, 'clear selection restores default')
})

test('glyphHitsNoteHead colors the head and its stem, not the neighbor', () => {
  const head = { x: 100, y: 80, w: 10, h: 8 }
  assert(glyphHitsNoteHead({ x: 101, y: 81, w: 8, h: 6 }, [head]), 'head glyph hits')
  assert(glyphHitsNoteHead({ x: 104, y: 50, w: 2, h: 30 }, [head]), 'stem above the head still hits')
  assert(!glyphHitsNoteHead({ x: 140, y: 81, w: 8, h: 6 }, [head]), 'neighbor to the right misses')
})
