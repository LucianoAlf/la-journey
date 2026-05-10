import { memo } from 'react'
import { BlockFrame } from './BlockFrame'
import { areEditableBlockComponentPropsEqual, type EditableBlockComponentProps } from './types'

function PageBreakBlockComponent(props: EditableBlockComponentProps) {
  return <BlockFrame {...props}>{props.renderPreview()}</BlockFrame>
}

export const PageBreakBlock = memo(PageBreakBlockComponent, areEditableBlockComponentPropsEqual)
