import { memo } from 'react'
import { TextBlockBase } from './TextBlockBase'
import { areEditableBlockComponentPropsEqual, type EditableBlockComponentProps } from './types'

function TipBlockComponent(props: EditableBlockComponentProps) {
  return <TextBlockBase {...props} />
}

export const TipBlock = memo(TipBlockComponent, areEditableBlockComponentPropsEqual)
