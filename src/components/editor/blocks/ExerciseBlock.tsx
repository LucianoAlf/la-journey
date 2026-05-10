import { memo } from 'react'
import { TextBlockBase } from './TextBlockBase'
import { areEditableBlockComponentPropsEqual, type EditableBlockComponentProps } from './types'

function ExerciseBlockComponent(props: EditableBlockComponentProps) {
  return <TextBlockBase {...props} />
}

export const ExerciseBlock = memo(ExerciseBlockComponent, areEditableBlockComponentPropsEqual)
