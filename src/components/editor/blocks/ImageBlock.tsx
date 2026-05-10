import { memo } from 'react'
import { BlockFrame } from './BlockFrame'
import { areEditableBlockComponentPropsEqual, type EditableBlockComponentProps } from './types'

function ImageBlockComponent(props: EditableBlockComponentProps) {
  return <BlockFrame {...props}>{props.renderPreview()}</BlockFrame>
}

export const ImageBlock = memo(ImageBlockComponent, areEditableBlockComponentPropsEqual)
