import { memo } from 'react'
import { BlockFrame } from './BlockFrame'
import { areEditableBlockComponentPropsEqual, type EditableBlockComponentProps } from './types'

function NotationBlockComponent(props: EditableBlockComponentProps) {
  return <BlockFrame {...props}>{props.renderPreview()}</BlockFrame>
}

export const NotationBlock = memo(NotationBlockComponent, areEditableBlockComponentPropsEqual)
