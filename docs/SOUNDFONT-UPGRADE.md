# Upgrade do SoundFont — Guia de Implementação

## Status Atual
- **SoundFont atual**: SONiVOX (~1.3MB) — embutido no AlphaTab
- **Localização**: `public/soundfont/sonivox.sf2`
- **Problema**: Som artificial, "8-bits", sem realismo nos timbres

## Opções de SoundFont de Alta Qualidade

| SoundFont | Tamanho | Foco | Link |
|-----------|---------|------|------|
| **FluidR3_GM** | ~142MB | Padrão ouro GM, todos os 128 instrumentos | [Polyphone](https://www.polyphone.io/en/soundfonts/instrument-sets/250-fluidr3-gm) |
| **Arachno** | ~150MB | Otimizado para banda (guitarra, baixo, bateria) | [Arachno](https://www.arachnosoft.com/main/soundfont.php) |
| **SGM-V2.01** | ~240MB | Ultra-realista, pianos e violões | [Archive.org](https://archive.org/details/SGM-V2.01) |
| **GeneralUser GS** | ~30MB | Bom equilíbrio tamanho/qualidade | [S. Christian Collins](https://schristiancollins.com/generaluser.php) |

## Recomendação

**Para o LA Journey**: `GeneralUser GS` (~30MB) — melhor custo-benefício para web:
- 10x melhor que SONiVOX em qualidade
- 30MB é aceitável com cache (baixa uma vez, usa sempre)
- Se quiser o melhor possível: `FluidR3_GM` (142MB) — excelente para tudo

## Como Instalar

### Passo 1: Baixar o SoundFont
```bash
# Opção A: GeneralUser GS (~30MB) — RECOMENDADO
# Baixar de: https://schristiancollins.com/generaluser.php
# Salvar como: public/soundfont/generaluser-gs.sf2

# Opção B: FluidR3_GM (~142MB) — MÁXIMA QUALIDADE
# Baixar de: https://www.polyphone.io/en/soundfonts/instrument-sets/250-fluidr3-gm
# Salvar como: public/soundfont/fluidr3-gm.sf2
```

### Passo 2: Atualizar a configuração do AlphaTab
No arquivo `src/components/music/AlphaTabPlayer.tsx`, alterar a linha:
```typescript
settings.player.soundFont = window.location.origin + '/soundfont/sonivox.sf2'
```
Para:
```typescript
settings.player.soundFont = window.location.origin + '/soundfont/generaluser-gs.sf2'
```

### Passo 3: Adicionar ao .gitignore (se > 50MB)
Se usar FluidR3_GM (142MB), adicionar ao `.gitignore`:
```
public/soundfont/fluidr3-gm.sf2
```
E hospedar no Supabase Storage ou CDN separado.

## Estratégia de Cache

O navegador faz cache automático do SoundFont via HTTP headers. Para garantir:

1. **Em produção (Vercel/Netlify)**: Configurar `Cache-Control: public, max-age=31536000, immutable` para `/soundfont/*`
2. **Vite dev server**: Já faz cache local via módulos

O AlphaTab carrega o SoundFont em **background** — não bloqueia a renderização da tablatura.

## Abordagem Multi-SoundFont (Avançada)

O AlphaTab v1.1+ suporta carregar múltiplos SoundFonts sob demanda:
```typescript
// No evento scoreLoaded, detectar quais instrumentos a música usa
api.scoreLoaded.on((score) => {
  const programs = new Set<number>()
  for (const track of score.tracks) {
    programs.add(track.playbackInfo.program)
  }
  
  // Carregar SoundFonts específicos
  if (programs.has(25)) { // Guitarra acústica
    fetch('/soundfont/guitar-hq.sf2')
      .then(r => r.arrayBuffer())
      .then(data => api.loadSoundFont(new Uint8Array(data), true))
  }
})
```

Esta abordagem permite:
- Carregar SONiVOX base (1.3MB) instantaneamente
- Carregar instrumentos HQ sob demanda (5-15MB cada)
- Experiência progressiva: som básico → som realista

## Nota sobre o Songsterr

O Songsterr usa **Web Audio API** com samples de áudio pré-renderizados por instrumento,
não SoundFonts tradicionais. Cada nota é um sample WAV/MP3 individual, permitindo
qualidade de estúdio. Essa abordagem requer infraestrutura proprietária e licenciamento
de samples profissionais — não é replicável com SoundFonts open-source.

A melhor aproximação gratuita é usar FluidR3_GM ou GeneralUser GS.
