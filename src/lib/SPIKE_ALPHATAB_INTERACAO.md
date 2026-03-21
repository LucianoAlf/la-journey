# Spike de Interação — AlphaTab expõe posições dos beats?

## Resultado: ✅ SIM

O AlphaTab expõe posições dos beats renderizados via a API `BoundsLookup`.

## APIs disponíveis

### 1. `api.renderer.boundsLookup` (ou `api.boundsLookup`)
Após o render completar (`renderFinished`), o AlphaTab disponibiliza um `BoundsLookup`
que contém a hierarquia completa de posições:

```
staffSystems → bars(1) → bars(2) → beats → notes
```

### 2. `getBeatAtPos(x, y)` → `Beat | null`
Dado coordenadas absolutas (x, y), retorna o Beat naquela posição.

### 3. `getNoteAtPos(beat, x, y)` → `Note | null`
Dado um beat e coordenadas, retorna a nota específica.
Requer `settings.core.includeNoteBounds = true`.

### 4. `findBeat(beat)` → `BeatBounds`
Dado um Beat do modelo, retorna seus bounds (posição/tamanho no render).

### 5. Eventos de interação nativos
- `api.beatMouseDown.on((beat) => { ... })` — click em beat
- `api.beatMouseMove` — hover
- `api.noteMouseDown` — click em nota específica

## Conclusão: NÃO precisamos de SVG editor separado

Diferente do que pensávamos, o AlphaTab tem APIs nativas para:
1. Detectar qual beat/nota o usuário clicou
2. Obter posições x/y dos beats renderizados
3. Eventos de mouse nativos

### Abordagem recomendada para interação:

**Opção A — Overlay HTML sobre AlphaTab (RECOMENDADA)**
- Usar `findBeat()` para obter bounds de cada beat
- Criar overlay HTML com `position: absolute` sobre o AlphaTab SVG
- Ghost note, seleção, hover — tudo via overlay
- Mesma abordagem do `NotationEditor` atual, mas com coordenadas do AlphaTab

**Opção B — Eventos nativos do AlphaTab**
- Usar `beatMouseDown`, `noteMouseDown` diretamente
- Mais simples, menos customizável
- Pode ser suficiente para seleção básica

**Opção C — Híbrida (melhor)**
- Usar eventos nativos para seleção (beatMouseDown)
- Usar boundsLookup para posicionar overlays (ghost note, cursor)
- Toolbar e teclado para input (como hoje)

### Impacto na estimativa
A Fase 2 e 3 ficam mais simples do que com SVG editor separado.
Não precisamos criar um `NotationSvgEditor` — o AlphaTab é interativo nativamente.

### Configuração necessária
```typescript
settings.core.includeNoteBounds = true  // para getNoteAtPos
// Eventos já funcionam sem config extra
```

---

*Spike realizado em 21/03/2026 — Cascade (Windsurf)*
