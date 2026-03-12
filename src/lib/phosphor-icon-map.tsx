import {
  Trophy, Ear, MusicNote, Guitar, MicrophoneStage, Star,
  Medal, Lightning, Fire, Target, Heart, Sparkle,
  Crown, Rocket, Flag, HandsClapping, MusicNotes
} from '@phosphor-icons/react'
import type { ComponentType } from 'react'

type PhosphorIcon = ComponentType<{ size?: number; weight?: 'regular' | 'fill' | 'bold'; className?: string }>

const ICON_MAP: Record<string, PhosphorIcon> = {
  'ph-trophy': Trophy,
  'ph-ear': Ear,
  'ph-music-note': MusicNote,
  'ph-music-notes': MusicNotes,
  'ph-guitar': Guitar,
  'ph-microphone-stage': MicrophoneStage,
  'ph-star': Star,
  'ph-medal': Medal,
  'ph-lightning': Lightning,
  'ph-fire': Fire,
  'ph-target': Target,
  'ph-heart': Heart,
  'ph-sparkle': Sparkle,
  'ph-crown': Crown,
  'ph-rocket': Rocket,
  'ph-flag': Flag,
  'ph-hands-clapping': HandsClapping,
}

interface PhosphorIconRendererProps {
  name: string | null | undefined
  size?: number
  className?: string
  fallback?: string
}

export function PhosphorIconRenderer({ name, size = 24, className, fallback = '🏅' }: PhosphorIconRendererProps) {
  if (!name) return <span className={className}>{fallback}</span>

  const Icon = ICON_MAP[name]
  if (Icon) return <Icon size={size} className={className} />

  return <span className={className}>{fallback}</span>
}
