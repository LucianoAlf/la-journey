import { readFileSync, writeFileSync } from 'fs'

const { real, bpmOnly } = JSON.parse(readFileSync('scripts/enrich-clean.json', 'utf-8'))
const lines = []

// URLs reais (BPM + YouTube)
for (const u of real) {
  const sets = []
  if (u.bpm != null) sets.push(`bpm = ${u.bpm}`)
  if (u.youtube_url) sets.push(`youtube_url = '${u.youtube_url.replace(/'/g, "''")}'`)
  lines.push(`UPDATE repertoire SET ${sets.join(', ')} WHERE id = '${u.id}';`)
}

// Só BPM (sem YouTube ou YouTube fake)
for (const u of bpmOnly) {
  lines.push(`UPDATE repertoire SET bpm = ${u.bpm} WHERE id = '${u.id}';`)
}

writeFileSync('scripts/enrich-clean.sql', lines.join('\n'), 'utf-8')
console.log(`SQL limpo: ${lines.length} statements`)
console.log(`Com YouTube: ${real.length}`)
console.log(`Só BPM: ${bpmOnly.length}`)
