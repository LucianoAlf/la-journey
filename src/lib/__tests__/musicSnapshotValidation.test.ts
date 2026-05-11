import { isUsableMusicSnapshotHtml } from '../musicSnapshotValidation'

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

const staffOnlySvg = '<svg><rect x="20" y="10" width="300" height="1"></rect><rect x="20" y="18" width="300" height="1"></rect><rect x="20" y="26" width="300" height="1"></rect><rect x="20" y="34" width="300" height="1"></rect><rect x="20" y="42" width="300" height="1"></rect></svg>'
const staffWithOnlyClef = '<svg><rect x="20" y="10" width="300" height="1"></rect><path d="M10 10 C12 8 16 8 18 10"></path></svg>'
const staffWithStemsAndLedgerLines = '<svg><rect x="20" y="10" width="300" height="1"></rect><rect x="20" y="18" width="300" height="1"></rect><path d="M100 40 L100 80"></path><path d="M120 36 L120 76"></path><path d="M92 62 L112 62"></path></svg>'
const notationWithNotehead = '<svg><rect x="20" y="10" width="300" height="1"></rect><path d="M10 10 C12 8 16 8 18 10"></path><path d="M20 20 C22 18 26 18 28 20 C30 22 30 26 28 28 C26 30 22 30 20 28 C18 26 18 22 20 20 Z"></path></svg>'
const keyboardSvg = '<svg>' + Array.from({ length: 7 }, (_, i) => `<polygon points="${i},0 ${i + 1},0 ${i + 1},10 ${i},10" fill="#fff"></polygon>`).join('') + '<polygon points="1,0 1.5,0 1.5,6 1,6" fill="#111"></polygon></svg>'
const chordSvg = '<svg><line x1="0" x2="100" y1="0" y2="0"></line><circle cx="30" cy="30" r="8" fill="#FF2D78"></circle></svg>'

test('rejects staff-only AlphaTab snapshots', () => {
  assert(!isUsableMusicSnapshotHtml(staffOnlySvg, 'notation'), 'staff-only notation snapshot should be rejected')
  assert(!isUsableMusicSnapshotHtml(staffOnlySvg, 'tablature'), 'staff-only tablature snapshot should be rejected')
  assert(!isUsableMusicSnapshotHtml(staffWithOnlyClef, 'notation'), 'staff with only a clef-like path should be rejected')
  assert(!isUsableMusicSnapshotHtml(staffWithStemsAndLedgerLines, 'notation'), 'staff with stems and ledger lines but no noteheads should be rejected')
})

test('accepts AlphaTab snapshots with noteheads', () => {
  assert(isUsableMusicSnapshotHtml(notationWithNotehead, 'notation'), 'notation with a notehead should be accepted')
})

test('accepts keyboard snapshots with enough keys', () => {
  assert(isUsableMusicSnapshotHtml(keyboardSvg, 'keyboard'), 'keyboard SVG should be accepted')
})

test('accepts chord snapshots with a filled dot', () => {
  assert(isUsableMusicSnapshotHtml(chordSvg, 'chord_grid'), 'chord grid SVG should be accepted')
})
