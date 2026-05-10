import { memo } from 'react'
import { TextBlockBase } from './TextBlockBase'
import { areEditableBlockComponentPropsEqual, type EditableBlockComponentProps } from './types'

function TitleBlockComponent(props: EditableBlockComponentProps) {
  return <TextBlockBase {...props} />
}

export const TitleBlock = memo(TitleBlockComponent, areEditableBlockComponentPropsEqual)
