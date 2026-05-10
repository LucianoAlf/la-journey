import { memo } from 'react'
import { BlockFrame } from './BlockFrame'
import { areEditableBlockComponentPropsEqual, type EditableBlockComponentProps } from './types'

function CoverBlockComponent(props: EditableBlockComponentProps) {
  return <BlockFrame {...props}>{props.renderPreview()}</BlockFrame>
}

export const CoverBlock = memo(CoverBlockComponent, areEditableBlockComponentPropsEqual)
