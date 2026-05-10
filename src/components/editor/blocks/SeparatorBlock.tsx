import { memo } from 'react'
import { BlockFrame } from './BlockFrame'
import { areEditableBlockComponentPropsEqual, type EditableBlockComponentProps } from './types'

function SeparatorBlockComponent(props: EditableBlockComponentProps) {
  return <BlockFrame {...props}>{props.renderPreview()}</BlockFrame>
}

export const SeparatorBlock = memo(SeparatorBlockComponent, areEditableBlockComponentPropsEqual)
