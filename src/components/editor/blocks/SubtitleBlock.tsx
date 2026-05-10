import { memo } from 'react'
import { TextBlockBase } from './TextBlockBase'
import { areEditableBlockComponentPropsEqual, type EditableBlockComponentProps } from './types'

function SubtitleBlockComponent(props: EditableBlockComponentProps) {
  return <TextBlockBase {...props} />
}

export const SubtitleBlock = memo(SubtitleBlockComponent, areEditableBlockComponentPropsEqual)
