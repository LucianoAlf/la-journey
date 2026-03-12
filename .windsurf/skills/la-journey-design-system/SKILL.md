---
name: la-journey-design-system
description: "Complete design system for the LA Journey platform. Use this skill whenever creating new pages, components, modals, or UI elements for LA Journey. Also use when the user asks to style something, match the existing design, create a new page, fix the visual consistency, or mentions 'design system', 'dark mode', 'light mode', 'Phosphor icons', 'paleta de cores', 'LA Journey UI', or 'componente visual'. This skill contains the exact color tokens, typography, icon mapping, badge styles, card patterns, and component conventions used throughout the application. Always consult this before writing any JSX with visual elements."
---

# LA Journey — Design System

## Brand

- **Name:** LA Journey
- **Tagline:** Aprender → Ancorar → Evoluir → Celebrar
- **Theme:** Dark mode primary, Light mode secondary
- **Visual metaphor:** Journey, map, anchor, mountain

## Typography

| Font | Usage | Weight | Import |
|------|-------|--------|--------|
| Playfair Display | Serif — titles, section headers, brand elements | 600, 700 | Google Fonts |
| DM Sans | UI body, labels, buttons, form elements | 400, 500, 600, 700 | Google Fonts |
| DM Mono | Code, tablature, exercises, monospace data | 400, 500 | Google Fonts |

```css
/* Font classes */
.font-serif { font-family: 'Playfair Display', serif; }
.font-sans  { font-family: 'DM Sans', sans-serif; }     /* default */
.font-mono  { font-family: 'DM Mono', monospace; }
```

## Color Palette

### Core Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--azul-escuro` | `#1E3A5F` | Primary brand, headers, sidebar |
| `--azul` | `#2D5A8E` | Secondary blue, links |
| `--azul-claro` | `#4A7DC0` | Hover states, light accents |
| `--accent` | `#FF2D78` | CTA buttons, highlights, selected items |

### Stage Colors (core to the product)
| Stage | Token | Hex | Usage |
|-------|-------|-----|-------|
| Foundation | `--foundation` | `#6366F1` | Stage 1 — indigo |
| Grow | `--grow` | `#F97316` | Stage 2 — orange |
| Advance | `--advance` | `#22C55E` | Stage 3 — green |
| Master | `--master` | `#EC4899` | Stage 4 — pink |

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--verde` | `#22C55E` | Success, completed |
| `--dourado` | `#F59E0B` | Warning, badges, reputation |
| `--vermelho` | `#EF4444` | Error, danger, delete, alerts |

### Background & Surface (Dark Mode)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#0F172A` | Page background |
| `--bg2` | `#0B1120` | Deeper background |
| `--surface` | `#1E293B` | Card surfaces |
| `--card` | `#1E293B` | Card backgrounds |
| `--border` | `rgba(255,255,255,0.06)` | Borders, dividers |
| `--input-bg` | `#0F172A` | Form inputs |

### Background & Surface (Light Mode)
| Token | Hex |
|-------|-----|
| `--bg` | `#F8FAFC` |
| `--surface` | `#FFFFFF` |
| `--card` | `#FFFFFF` |
| `--border` | `rgba(0,0,0,0.08)` |

### Text
| Token | Dark | Light |
|-------|------|-------|
| `--text` | `#F1F5F9` | `#1E293B` |
| `--text2` | `#94A3B8` | `#64748B` |
| `--text3` | `#64748B` | `#94A3B8` |

### Soft Variants (10-15% opacity backgrounds)
Every color has a `-soft` variant for backgrounds:
```css
--accent-soft: rgba(255,45,120,0.08);
--foundation-soft: rgba(99,102,241,0.1);
--grow-soft: rgba(249,115,22,0.1);
--advance-soft: rgba(34,197,94,0.1);
--master-soft: rgba(236,72,153,0.1);
--azul-soft: rgba(30,58,95,0.08);
--verde-soft: rgba(34,197,94,0.08);
--dourado-soft: rgba(245,158,11,0.08);
--vermelho-soft: rgba(239,68,68,0.08);
```

## Icons — Phosphor Icons

**CDN:** `@phosphor-icons/web@2.1.1`
**React:** `@phosphor-icons/react`

### Page Icons (sidebar navigation)
| Page | Icon | Class/Component |
|------|------|----------------|
| Dashboard | `ph-squares-four` | `<SquaresFour />` |
| Jornadas | `ph-map-trifold` | `<MapTrifold />` |
| Gerador | `ph-file-text` | `<FileText />` |
| Editor Material | `ph-note-pencil` | `<NotePencil />` |
| Base Curada | `ph-books` | `<Books />` |
| Biblioteca Musical | `ph-music-notes-simple` | `<MusicNotesSimple />` |
| Alunos | `ph-users-three` | `<UsersThree />` |
| Repertório | `ph-music-note` | `<MusicNote />` |
| Turmas | `ph-chalkboard-teacher` | `<ChalkboardTeacher />` |
| Visão Professor | `ph-graduation-cap` | `<GraduationCap />` |
| Gamificação | `ph-trophy` | `<Trophy />` |
| WhatsApp | `ph-whatsapp-logo` | `<WhatsappLogo />` |
| Relatórios | `ph-chart-bar` | `<ChartBar />` |
| Integrações | `ph-plugs-connected` | `<PlugsConnected />` |
| Configurações | `ph-gear-six` | `<GearSix />` |

### Common Action Icons
| Action | Icon |
|--------|------|
| Add | `ph-plus` |
| Edit | `ph-pencil-simple` |
| Delete | `ph-trash` |
| Save | `ph-floppy-disk` |
| Export PDF | `ph-file-pdf` |
| Search | `ph-magnifying-glass` |
| Filter | `ph-funnel` |
| Back | `ph-arrow-left` |
| Theme toggle | `ph-moon` / `ph-sun` |
| Notifications | `ph-bell` |
| Collapse sidebar | `ph-caret-left` / `ph-caret-right` |
| Drag handle | `ph-dots-six-vertical` |
| Close | `ph-x` |
| Check | `ph-check` |
| Copy | `ph-copy` |

### Instrument Icons
| Instrument | Icon |
|------------|------|
| Violão/Guitarra | `ph-guitar` |
| Teclado/Piano | `ph-piano-keys` |
| Canto | `ph-microphone-stage` |
| Bateria | `ph-metronome` |
| Baixo | `ph-guitar` |
| Ukulele | `ph-guitar` |

## Component Patterns

### Cards
```css
border-radius: 14px;
background: var(--card);
border: 1px solid var(--border);
padding: 20px;
/* Hover: subtle shadow */
transition: all 0.2s;
```

### KPI Cards (Dashboard)
```
┌─────────────────────┐
│ ██ colored top bar   │  ← 3px solid var(--stage-color)
│ [icon]  Label        │  ← icon in 40x40 badge (border-radius:12px, bg: soft color)
│ 1.297                │  ← font-size:28px, font-weight:800
│ +12% este mês        │  ← font-size:11px, color:var(--text3)
└─────────────────────┘
```

### Badges
```css
.badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 20px;
}
/* Variants: badge-foundation, badge-grow, badge-advance, badge-master */
/* badge-azul, badge-verde, badge-dourado, badge-accent */
```

### Stage Badge Colors
| Badge | Background | Text |
|-------|-----------|------|
| Foundation | `rgba(99,102,241,0.15)` | `#6366F1` |
| Grow | `rgba(249,115,22,0.15)` | `#F97316` |
| Advance | `rgba(34,197,94,0.15)` | `#22C55E` |
| Master | `rgba(236,72,153,0.15)` | `#EC4899` |

### Buttons
```css
.btn-primary  { background: var(--azul-escuro); color: white; }
.btn-accent   { background: var(--accent); color: white; }
.btn-ghost    { background: transparent; color: var(--text2); border: 1px solid var(--border); }
/* All buttons: border-radius: 8px, padding: 8px 16px, font-size: 12px */
```

### Tables
```css
/* Header row: background var(--bg2), font-size: 9px, uppercase, letter-spacing: 2px */
/* Body rows: border-bottom 1px solid var(--border), padding 14px 16px */
/* Hover: background var(--azul-soft) */
```

### Forms
```css
.form-input, .form-select, .form-textarea {
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--text);
}
/* Focus: border-color var(--azul-claro), box-shadow: 0 0 0 3px rgba(30,58,95,0.15) */
```

### Sidebar
```
Width: 240px (expanded), 60px (collapsed)
Position: fixed
Background: var(--surface)
Border-right: 1px solid var(--border)
Nav items: 42px height, icon 18px, label 12px font-size
Active: background var(--azul-soft), border-left 3px solid var(--accent)
```

### Modals
```css
.modal-overlay { background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
.modal { max-width: 600px; border-radius: 14px; background: var(--surface); }
.modal-header { display: flex; justify-content: space-between; padding: 20px 24px; }
.modal-title { font-family: 'Playfair Display'; font-size: 18px; }
.modal-title em { color: var(--accent); font-style: normal; }  /* Highlighted word */
```

### Toast Notifications
```
Position: fixed bottom-right
background: var(--surface)
border-left: 3px solid var(--verde)  // or accent/dourado/vermelho
border-radius: 10px
auto-dismiss: 3 seconds
```

## Editor de Material — Specific Patterns

### 3-Panel Layout
```css
display: grid;
grid-template-columns: 260px 1fr 300px;  /* sidebar | canvas | properties */
height: calc(100vh - 80px);
```

### Block Item (sidebar list)
```css
border: 1.5px solid var(--border);
border-radius: 8px;
padding: 12px 14px;
cursor: pointer;
/* Selected: border-color var(--accent), bg var(--accent-soft), box-shadow ring */
/* Hover: show drag handle (⠿) left, show delete button right */
```

### Canvas Block (editable content)
```css
border: 2px solid transparent;
border-radius: 12px;
padding: 20px 24px;
/* Hover: border-color var(--border), bg var(--card) */
/* Selected: border-color var(--accent), ring */
/* [contenteditable]:focus: bg var(--input-bg), ring */
```

### Section Title Colors (by dimension)
| Dimension | Color | Emoji |
|-----------|-------|-------|
| Teoria | `var(--foundation)` | 📖 |
| Técnica | `var(--grow)` | 🎯 |
| Ritmo | `var(--advance)` | 🥁 |
| Repertório | `var(--master)` | 🎵 |

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|-----------|-------|----------|
| Mobile | < 768px | Sidebar collapsed, single column, bottom nav |
| Tablet | 768-1024px | Sidebar collapsed, 2 columns where applicable |
| Desktop | > 1024px | Full layout, sidebar expanded |
| Editor | > 1200px | 3-panel editor, below that stack vertically |

---

## shadcn/ui — Component Library Setup

### Installation (Vite + React + TypeScript)

**Prerequisites:** Tailwind CSS and path alias `@` → `src/` already configured.

```bash
# 1. Install shadcn CLI and initialize
npx shadcn@latest init

# When prompted:
# Style: New York
# Base color: Slate (closest to LA Journey dark theme)
# CSS variables: Yes
```

This creates:
- `components.json` — shadcn config
- `src/lib/utils.ts` — `cn()` helper for classnames
- `src/components/ui/` — component directory

### Install ALL Components Needed for LA Journey

```bash
# Core UI — install these immediately
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add textarea
npx shadcn@latest add checkbox
npx shadcn@latest add switch
npx shadcn@latest add badge
npx shadcn@latest add card
npx shadcn@latest add table
npx shadcn@latest add tabs
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add dropdown-menu
npx shadcn@latest add toast
npx shadcn@latest add skeleton
npx shadcn@latest add avatar
npx shadcn@latest add separator
npx shadcn@latest add progress
npx shadcn@latest add tooltip
npx shadcn@latest add scroll-area

# Forms & Date
npx shadcn@latest add form
npx shadcn@latest add calendar
npx shadcn@latest add popover
npx shadcn@latest add date-picker
npx shadcn@latest add radio-group

# Navigation
npx shadcn@latest add navigation-menu
npx shadcn@latest add breadcrumb
npx shadcn@latest add command

# Advanced
npx shadcn@latest add accordion
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add collapsible
```

### Component Mapping — LA Journey CSS → shadcn/ui

| Current CSS Class | shadcn/ui Component | Usage |
|-------------------|-------------------|-------|
| `.btn.btn-primary` | `<Button>` | Primary actions |
| `.btn.btn-accent` | `<Button variant="destructive">` with accent color override | CTA, highlights |
| `.btn.btn-ghost` | `<Button variant="ghost">` | Secondary actions |
| `.btn.btn-sm` | `<Button size="sm">` | Small buttons |
| `.form-input` | `<Input>` | Text inputs |
| `.form-select` | `<Select>` | Dropdowns |
| `.form-textarea` | `<Textarea>` | Multi-line input |
| `.form-label` | `<Label>` | Form labels |
| `.badge` | `<Badge>` | Status badges |
| `.card` | `<Card>` | Content cards |
| `.modal-overlay + .modal` | `<Dialog>` | Modals |
| `.tabs .tab` | `<Tabs>` | Tab navigation |
| `.toast` | `<Toast>` via `useToast()` | Notifications |
| Table HTML | `<Table>` | Data tables |
| Sidebar drawer (mobile) | `<Sheet>` | Mobile sidebar |
| Loading states | `<Skeleton>` | Data loading |
| `.progress-bar` | `<Progress>` | Progress indicators |
| Tooltip on hover | `<Tooltip>` | Help text |
| Date inputs | `<DatePicker>` (Calendar + Popover) | Date selection |
| Confirmation popups | `<AlertDialog>` | Delete confirmations |
| Sidebar nav | `<NavigationMenu>` or custom | Page navigation |
| Search/command | `<Command>` | Global search |

### Customizing shadcn/ui for LA Journey Theme

After init, update `src/index.css` with LA Journey tokens:

```css
@layer base {
  :root {
    /* Light mode */
    --background: 210 40% 98%;        /* #F8FAFC */
    --foreground: 215 25% 17%;        /* #1E293B */
    --card: 0 0% 100%;
    --card-foreground: 215 25% 17%;
    --popover: 0 0% 100%;
    --popover-foreground: 215 25% 17%;
    --primary: 213 52% 24%;           /* #1E3A5F — azul escuro */
    --primary-foreground: 210 40% 98%;
    --secondary: 215 20% 95%;
    --secondary-foreground: 215 25% 17%;
    --muted: 214 20% 90%;
    --muted-foreground: 215 16% 47%;
    --accent: 340 100% 59%;           /* #FF2D78 */
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84% 60%;         /* #EF4444 */
    --destructive-foreground: 0 0% 100%;
    --border: 214 20% 90%;
    --input: 214 20% 90%;
    --ring: 213 52% 24%;
    --radius: 0.75rem;                /* 12px — matches our 14px cards */

    /* Stage colors as CSS variables */
    --foundation: 239 84% 67%;        /* #6366F1 */
    --grow: 25 95% 53%;               /* #F97316 */
    --advance: 142 71% 45%;           /* #22C55E */
    --master: 330 81% 60%;            /* #EC4899 */
  }

  .dark {
    --background: 222 47% 11%;        /* #0F172A */
    --foreground: 210 40% 98%;        /* #F1F5F9 */
    --card: 215 28% 17%;              /* #1E293B */
    --card-foreground: 210 40% 98%;
    --popover: 215 28% 17%;
    --popover-foreground: 210 40% 98%;
    --primary: 213 52% 24%;           /* #1E3A5F */
    --primary-foreground: 210 40% 98%;
    --secondary: 215 28% 17%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --accent: 340 100% 59%;           /* #FF2D78 */
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 100% / 0.06;
    --input: 222 47% 11%;
    --ring: 213 52% 40%;
  }
}
```

### Stage-Specific Badge Variants

Extend shadcn Badge with custom variants:

```typescript
// src/components/ui/badge.tsx — add variants
const badgeVariants = cva(
  "...", // base classes
  {
    variants: {
      variant: {
        default: "...",
        secondary: "...",
        destructive: "...",
        outline: "...",
        // LA Journey custom variants
        foundation: "bg-indigo-500/15 text-indigo-400 border-transparent",
        grow: "bg-orange-500/15 text-orange-400 border-transparent",
        advance: "bg-green-500/15 text-green-400 border-transparent",
        master: "bg-pink-500/15 text-pink-400 border-transparent",
        accent: "bg-[#FF2D78]/15 text-[#FF2D78] border-transparent",
        gold: "bg-amber-500/15 text-amber-400 border-transparent",
      },
    },
  }
)
```

### Additional Dependencies for Full UI

```bash
# Drag and drop (journey builder, editor, topic reorder)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Charts (dashboard, relatórios)
npm install recharts

# Date handling
npm install date-fns

# Icons (already using Phosphor)
npm install @phosphor-icons/react
```

### Key shadcn/ui Usage Patterns for LA Journey

**Dialog (Modals):**
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

// "Nova Jornada" modal, "Novo Aluno" modal, etc.
<Dialog>
  <DialogTrigger asChild>
    <Button><Plus /> Nova Jornada</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Nova <span className="text-[#FF2D78]">Jornada</span></DialogTitle>
    </DialogHeader>
    {/* form content */}
  </DialogContent>
</Dialog>
```

**Tabs:**
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Biblioteca Musical: Acordes | Escalas | Notação | Imagens IA
<Tabs defaultValue="acordes">
  <TabsList>
    <TabsTrigger value="acordes">Acordes</TabsTrigger>
    <TabsTrigger value="escalas">Escalas</TabsTrigger>
  </TabsList>
  <TabsContent value="acordes">{/* chord grid */}</TabsContent>
  <TabsContent value="escalas">{/* scale table */}</TabsContent>
</Tabs>
```

**Toast:**
```tsx
import { useToast } from "@/hooks/use-toast"

const { toast } = useToast()
toast({
  title: "✅ Material gerado!",
  description: "Fundamentos 1 — 15 blocos",
})
```

**Sheet (Mobile Sidebar):**
```tsx
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon"><List /></Button>
  </SheetTrigger>
  <SheetContent side="left">
    {/* sidebar nav items */}
  </SheetContent>
</Sheet>
```

**Select:**
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Selecione o instrumento" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="violao">Violão</SelectItem>
    <SelectItem value="guitarra">Guitarra</SelectItem>
    <SelectItem value="teclado">Teclado</SelectItem>
  </SelectContent>
</Select>
```
