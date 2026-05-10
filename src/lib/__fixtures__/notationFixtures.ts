import type { Beat } from '../beatsToAlphaTex'

export type NotationFixtureMode = 'free' | 'free-with-separators' | 'metered' | 'tablature'

export interface NotationFixture {
  name: string
  mode: NotationFixtureMode
  notation_data: {
    clef?: string
    keySignature?: string
    timeSignature?: string | null
    time_signature_mode: NotationFixtureMode
    beats: Beat[]
  }
  expected_alphaTex: {
    contains?: string[]
    notContains?: string[]
  }
}

function note(pitch: string): Beat {
  return {
    pitches: [{ pitch, accidental: null }],
    duration: 'q',
    tie: false,
    isRest: false,
    dotted: false,
    cifra: null,
    annotation: null,
    lyric: null,
  }
}

function chord(pitches: string[]): Beat {
  return {
    ...note(pitches[0]),
    pitches: pitches.map(pitch => ({ pitch, accidental: null })),
  }
}

function rest(duration: string): Beat {
  return {
    pitches: [],
    duration,
    tie: false,
    isRest: true,
    dotted: false,
    cifra: null,
    annotation: null,
    lyric: null,
  }
}

export const notationFixtures: NotationFixture[] = [
  {
    name: 'Free - lines treble',
    mode: 'free',
    notation_data: {
      clef: 'treble',
      keySignature: 'C',
      timeSignature: null,
      time_signature_mode: 'free',
      beats: ['E/4', 'G/4', 'B/4', 'D/5', 'F/5'].map(note),
    },
    expected_alphaTex: {
      contains: ['\\staff{score}', ':4 e', 'g', 'b', 'd', 'f'],
      notContains: ['\\ts', '|'],
    },
  },
  {
    name: 'Free - spaces treble',
    mode: 'free',
    notation_data: {
      clef: 'treble',
      keySignature: 'C',
      timeSignature: null,
      time_signature_mode: 'free',
      beats: ['F/4', 'A/4', 'C/5', 'E/5'].map(note),
    },
    expected_alphaTex: {
      contains: [':4 f', 'a', 'c', 'e'],
      notContains: ['\\ts', '|'],
    },
  },
  {
    name: 'Free with pedagogical separators - C scale',
    mode: 'free-with-separators',
    notation_data: {
      clef: 'treble',
      keySignature: 'C',
      timeSignature: null,
      time_signature_mode: 'free-with-separators',
      beats: ['C/4', 'D/4', 'E/4', 'F/4', 'G/4', 'A/4', 'B/4', 'C/5'].map((pitch, index) => ({
        ...note(pitch),
        pedagogical_separator: index === 3,
        barAfter: index === 3,
      } as Beat)),
    },
    expected_alphaTex: {
      contains: [':4 c', 'd', 'e', 'f', 'g', 'a', 'b'],
      notContains: ['\\ts', '|'],
    },
  },
  {
    name: 'Metered 4/4 - durations',
    mode: 'metered',
    notation_data: {
      clef: 'treble',
      keySignature: 'C',
      timeSignature: '4/4',
      time_signature_mode: 'metered',
      beats: [
        note('C/4'),
        { ...note('D/4'), duration: 'h' },
        { ...note('E/4'), duration: '8' },
        rest('q'),
      ],
    },
    expected_alphaTex: {
      contains: ['\\ts 4 4', ':4 c', ':2 d', ':8 e', ':4 r'],
    },
  },
  {
    name: 'Metered 2/4',
    mode: 'metered',
    notation_data: {
      clef: 'treble',
      keySignature: 'C',
      timeSignature: '2/4',
      time_signature_mode: 'metered',
      beats: ['C/4', 'D/4'].map(note),
    },
    expected_alphaTex: { contains: ['\\ts 2 4'] },
  },
  {
    name: 'Metered 3/4',
    mode: 'metered',
    notation_data: {
      clef: 'treble',
      keySignature: 'C',
      timeSignature: '3/4',
      time_signature_mode: 'metered',
      beats: ['C/4', 'D/4', 'E/4'].map(note),
    },
    expected_alphaTex: { contains: ['\\ts 3 4'] },
  },
  {
    name: 'Harmonic intervals',
    mode: 'free',
    notation_data: {
      clef: 'treble',
      keySignature: 'C',
      timeSignature: null,
      time_signature_mode: 'free',
      beats: [
        chord(['C/4', 'E/4']),
        chord(['C/4', 'G/4']),
        chord(['C/4', 'C/5']),
      ],
    },
    expected_alphaTex: {
      contains: ['(', ')'],
      notContains: ['\\ts'],
    },
  },
  {
    name: 'Triads',
    mode: 'free',
    notation_data: {
      clef: 'treble',
      keySignature: 'C',
      timeSignature: null,
      time_signature_mode: 'free',
      beats: [
        chord(['C/4', 'E/4', 'G/4']),
        chord(['D/4', 'F/4', 'A/4']),
        chord(['E/4', 'G/4', 'B/4']),
        chord(['F/4', 'A/4', 'C/5']),
        chord(['G/4', 'B/4', 'D/5']),
        chord(['A/4', 'C/5', 'E/5']),
        chord(['B/4', 'D/5', 'F/5']),
      ],
    },
    expected_alphaTex: {
      contains: ['(', ')'],
      notContains: ['\\ts'],
    },
  },
  {
    name: 'Bass clef lines and spaces',
    mode: 'free',
    notation_data: {
      clef: 'bass',
      keySignature: 'C',
      timeSignature: null,
      time_signature_mode: 'free',
      beats: ['G/2', 'B/2', 'D/3', 'F/3', 'A/3'].map(note),
    },
    expected_alphaTex: {
      contains: ['\\clef F4'],
      notContains: ['\\ts'],
    },
  },
  {
    name: 'Key signature G major',
    mode: 'metered',
    notation_data: {
      clef: 'treble',
      keySignature: 'G',
      timeSignature: '4/4',
      time_signature_mode: 'metered',
      beats: ['G/4', 'A/4', 'B/4', 'C/5'].map(note),
    },
    expected_alphaTex: {
      contains: ['\\ks Gmajor', '\\ts 4 4'],
    },
  },
]

export const tablatureFixture = {
  name: 'Tablature - chromatic 1-2-3-4',
  mode: 'tablature' as const,
  alphaTex: '\\title "Cromatico 1-2-3-4" \\instrument guitar . :4 1.6 2.6 3.6 4.6 | 1.5 2.5 3.5 4.5',
}
