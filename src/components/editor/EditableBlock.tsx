import { memo } from 'react'
import { TextBlock } from './blocks/TextBlock'
import { TitleBlock } from './blocks/TitleBlock'
import { SubtitleBlock } from './blocks/SubtitleBlock'
import { TipBlock } from './blocks/TipBlock'
import { ExerciseBlock } from './blocks/ExerciseBlock'
import { NotationBlock } from './blocks/NotationBlock'
import { KeyboardBlock } from './blocks/KeyboardBlock'
import { ChordGridBlock } from './blocks/ChordGridBlock'
import { ImageBlock } from './blocks/ImageBlock'
import { CoverBlock } from './blocks/CoverBlock'
import { PageBreakBlock } from './blocks/PageBreakBlock'
import { SeparatorBlock } from './blocks/SeparatorBlock'
import {
  areEditableBlockComponentPropsEqual,
  type EditableBlockComponentProps,
  type EditableBlockData,
  type EditableBlockMode,
} from './blocks/types'

export type { EditableBlockData, EditableBlockMode }

function EditableBlockComponent(props: EditableBlockComponentProps) {
  switch (props.block.block_type) {
    case 'title':
      return <TitleBlock {...props} />
    case 'subtitle':
      return <SubtitleBlock {...props} />
    case 'tip':
      return <TipBlock {...props} />
    case 'exercise':
      return <ExerciseBlock {...props} />
    case 'notation':
    case 'rhythm':
    case 'tablature':
      return <NotationBlock {...props} />
    case 'keyboard':
    case 'keyboard_grid':
      return <KeyboardBlock {...props} />
    case 'chord_grid':
    case 'chord_diagram':
      return <ChordGridBlock {...props} />
    case 'image':
      return <ImageBlock {...props} />
    case 'cover':
      return <CoverBlock {...props} />
    case 'page_break':
      return <PageBreakBlock {...props} />
    case 'separator':
      return <SeparatorBlock {...props} />
    case 'text':
    default:
      return <TextBlock {...props} />
  }
}

export const EditableBlock = memo(EditableBlockComponent, areEditableBlockComponentPropsEqual)
