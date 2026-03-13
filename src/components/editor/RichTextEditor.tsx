import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import { useCallback, useEffect, useRef } from 'react'
import {
  TextB, TextItalic, TextUnderline, TextStrikethrough,
  TextHOne, TextHTwo, TextHThree,
  ListBullets, ListNumbers, TextAlignLeft, TextAlignCenter,
  TextAlignRight, Quotes, Minus, LinkSimple, HighlighterCircle,
  Eraser, ArrowCounterClockwise, ArrowClockwise, Palette,
} from '@phosphor-icons/react'

// ─── Cores rápidas ────────────────────────────────────────────────
const QUICK_COLORS = [
  { label: 'Padrão', value: '' },
  { label: 'Preto', value: '#000000' },
  { label: 'Vermelho', value: '#dc2626' },
  { label: 'Laranja', value: '#ea580c' },
  { label: 'Dourado', value: '#ca8a04' },
  { label: 'Verde', value: '#16a34a' },
  { label: 'Azul', value: '#2563eb' },
  { label: 'Roxo', value: '#7c3aed' },
  { label: 'Rosa', value: '#db2777' },
  { label: 'Cinza', value: '#6b7280' },
  { label: 'Branco', value: '#ffffff' },
]

// ─── Fontes disponíveis ──────────────────────────────────────────
const FONT_FAMILIES = [
  { label: 'DM Sans (padrão)', value: '' },
  { label: 'Playfair Display', value: 'Playfair Display' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Open Sans', value: 'Open Sans' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Poppins', value: 'Poppins' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Merriweather', value: 'Merriweather' },
  { label: 'Lora', value: 'Lora' },
  { label: 'Raleway', value: 'Raleway' },
  { label: 'Nunito', value: 'Nunito' },
  { label: 'DM Mono', value: 'DM Mono' },
]

// ─── Props ────────────────────────────────────────────────────────
interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  /** Modo compacto para o painel lateral (toolbar menor) */
  compact?: boolean
  /** Modo inline para o canvas (sem bordas, fundo transparente, BubbleMenu only) */
  inline?: boolean
  /** Variante de toolbar: 'full' (padrão), 'title' (H1-H3 + B/I/U + alinhamento) */
  variant?: 'full' | 'title'
  /** Classe CSS adicional */
  className?: string
  /** Desabilitar edição */
  disabled?: boolean
}

// ─── Botão da toolbar ─────────────────────────────────────────────
function ToolbarBtn({
  icon: Icon, label, active, onClick, disabled,
}: {
  icon: React.ElementType; label: string; active?: boolean; onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`
        w-7 h-7 flex items-center justify-center rounded-md text-[13px] transition-colors
        ${active ? 'bg-accent/20 text-accent' : 'text-text2 hover:bg-bg2 hover:text-text'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <Icon size={15} weight={active ? 'bold' : 'regular'} />
    </button>
  )
}

function ToolbarSep() {
  return <div className="w-px h-5 bg-border mx-0.5" />
}

// ─── Componente principal ─────────────────────────────────────────
export function RichTextEditor({
  content, onChange, placeholder = 'Digite o conteúdo...', compact = false, inline = false,
  variant = 'full', className = '', disabled = false,
}: RichTextEditorProps) {
  const isInternalUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
        link: false,
        underline: false,
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-accent underline' } }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      isInternalUpdate.current = true
      onChange(ed.getHTML())
    },
  })

  // Sincronizar content externo (quando muda de bloco)
  useEffect(() => {
    if (!editor) return
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }
    const currentHtml = editor.getHTML()
    if (currentHtml !== content) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  // Desabilitar/habilitar edição
  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [disabled, editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href ?? ''
    const url = window.prompt('URL do link:', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const setColor = useCallback((color: string) => {
    if (!editor) return
    if (!color) {
      editor.chain().focus().unsetColor().run()
    } else {
      editor.chain().focus().setColor(color).run()
    }
  }, [editor])

  const setFont = useCallback((font: string) => {
    if (!editor) return
    if (!font) {
      editor.chain().focus().unsetFontFamily().run()
    } else {
      editor.chain().focus().setFontFamily(font).run()
    }
  }, [editor])

  /** Detecta a fonte ativa no cursor */
  const currentFont = editor?.getAttributes('textStyle')?.fontFamily ?? ''

  if (!editor) return null

  // ─── Seletor de fonte (reutilizado nas toolbars) ─────────────────
  const fontSelect = (
    <select
      value={currentFont}
      onChange={(e) => setFont(e.target.value)}
      title="Fonte"
      className="h-7 px-1.5 text-[11px] bg-bg2 border border-border rounded-md text-text2 cursor-pointer outline-none hover:border-accent/50 transition-colors max-w-[130px]"
      style={{ fontFamily: currentFont || 'var(--font-sans)' }}
    >
      {FONT_FAMILIES.map(f => (
        <option key={f.value || '_default'} value={f.value} style={{ fontFamily: f.value || 'var(--font-sans)' }}>
          {f.label}
        </option>
      ))}
    </select>
  )

  // ─── Toolbar do título (compacta: H1-H3 + B/I/U + alinhamento + fonte) ─
  const titleToolbar = (
    <div className="flex items-center gap-0.5 flex-wrap p-1.5 border-b border-border bg-surface/80">
      {fontSelect}
      <ToolbarSep />
      <ToolbarBtn icon={TextHOne} label="Título 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <ToolbarBtn icon={TextHTwo} label="Título 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolbarBtn icon={TextHThree} label="Título 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <ToolbarSep />
      <ToolbarBtn icon={TextB} label="Negrito (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarBtn icon={TextItalic} label="Itálico (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarBtn icon={TextUnderline} label="Sublinhado (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolbarSep />
      <ToolbarBtn icon={TextAlignLeft} label="Alinhar esquerda" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
      <ToolbarBtn icon={TextAlignCenter} label="Centralizar" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
      <ToolbarBtn icon={TextAlignRight} label="Alinhar direita" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
    </div>
  )

  // ─── Toolbar completa ─────────────────────────────────────────
  const toolbar = (
    <div className={`flex items-center gap-0.5 flex-wrap ${compact ? 'p-1.5' : 'p-2'} border-b border-border bg-surface/80`}>
      {/* Undo / Redo */}
      <ToolbarBtn icon={ArrowCounterClockwise} label="Desfazer" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
      <ToolbarBtn icon={ArrowClockwise} label="Refazer" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />
      <ToolbarSep />

      {/* Fonte */}
      {fontSelect}
      <ToolbarSep />

      {/* Formatação de texto */}
      <ToolbarBtn icon={TextB} label="Negrito (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarBtn icon={TextItalic} label="Itálico (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarBtn icon={TextUnderline} label="Sublinhado (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolbarBtn icon={TextStrikethrough} label="Tachado" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <ToolbarSep />

      {/* Headings */}
      <ToolbarBtn icon={TextHOne} label="Título 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <ToolbarBtn icon={TextHTwo} label="Título 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolbarBtn icon={TextHThree} label="Título 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <ToolbarSep />

      {/* Listas */}
      <ToolbarBtn icon={ListBullets} label="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarBtn icon={ListNumbers} label="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolbarSep />

      {/* Alinhamento */}
      <ToolbarBtn icon={TextAlignLeft} label="Alinhar esquerda" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
      <ToolbarBtn icon={TextAlignCenter} label="Centralizar" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
      <ToolbarBtn icon={TextAlignRight} label="Alinhar direita" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
      <ToolbarSep />

      {/* Extras */}
      <ToolbarBtn icon={Quotes} label="Citação" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <ToolbarBtn icon={HighlighterCircle} label="Destacar" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} />
      <ToolbarBtn icon={LinkSimple} label="Link" active={editor.isActive('link')} onClick={setLink} />
      <ToolbarBtn icon={Minus} label="Linha horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
      <ToolbarBtn icon={Eraser} label="Limpar formatação" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} />

      {/* Cores */}
      {!compact && (
        <>
          <ToolbarSep />
          <div className="flex items-center gap-0.5 ml-0.5">
            <Palette size={13} className="text-text3 mr-0.5" />
            {QUICK_COLORS.map(c => (
              <button
                key={c.value || 'default'}
                type="button"
                title={c.label}
                onClick={() => setColor(c.value)}
                className="w-4 h-4 rounded-full border border-border/50 hover:scale-125 transition-transform"
                style={{ background: c.value || 'var(--text)' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className={`rich-text-editor rounded-lg border border-border overflow-hidden ${inline ? 'border-transparent bg-transparent' : 'bg-card'} ${className}`}>
      {!inline && (variant === 'title' ? titleToolbar : toolbar)}
      <BubbleMenu editor={editor} options={{ placement: 'top', offset: 8 }}>
        <div className="flex items-center gap-0.5 p-1.5 bg-surface border border-border rounded-lg shadow-lg">
          <ToolbarBtn icon={TextB} label="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
          <ToolbarBtn icon={TextItalic} label="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <ToolbarBtn icon={TextUnderline} label="Sublinhado" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <ToolbarBtn icon={HighlighterCircle} label="Destacar" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} />
          <ToolbarSep />
          <ToolbarBtn icon={LinkSimple} label="Link" active={editor.isActive('link')} onClick={setLink} />
          <ToolbarSep />
          {QUICK_COLORS.slice(1, 7).map(c => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => setColor(c.value)}
              className="w-3.5 h-3.5 rounded-full border border-border/50 hover:scale-125 transition-transform"
              style={{ background: c.value }}
            />
          ))}
        </div>
      </BubbleMenu>
      <EditorContent
        editor={editor}
        className={`
          prose prose-sm max-w-none
          ${inline ? 'px-0 py-0' : variant === 'title' ? 'px-3 py-1.5' : compact ? 'px-3 py-2 min-h-[120px]' : 'px-4 py-3 min-h-[200px]'}
          text-[13px] leading-relaxed text-text2
          focus-within:outline-none
          [&_.tiptap]:outline-none
          [&_.tiptap_p]:mb-2
          [&_.tiptap_h1]:text-[22px] [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:text-text [&_.tiptap_h1]:mb-3
          [&_.tiptap_h2]:text-[18px] [&_.tiptap_h2]:font-bold [&_.tiptap_h2]:text-text [&_.tiptap_h2]:mb-2
          [&_.tiptap_h3]:text-[15px] [&_.tiptap_h3]:font-bold [&_.tiptap_h3]:text-text [&_.tiptap_h3]:mb-2
          [&_.tiptap_strong]:text-text [&_.tiptap_strong]:font-extrabold
          [&_.tiptap_em]:text-text2
          [&_.tiptap_blockquote]:border-l-[3px] [&_.tiptap_blockquote]:border-accent/40 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:italic [&_.tiptap_blockquote]:text-text3
          [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ul]:mb-2
          [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_ol]:mb-2
          [&_.tiptap_li]:mb-0.5
          [&_.tiptap_hr]:border-border [&_.tiptap_hr]:my-4
          [&_.tiptap_mark]:bg-yellow-200/80 [&_.tiptap_mark]:rounded-sm [&_.tiptap_mark]:px-0.5
          [&_.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.is-editor-empty]:before:text-text3/50 [&_.is-editor-empty]:before:float-left [&_.is-editor-empty]:before:pointer-events-none [&_.is-editor-empty]:before:h-0
          [&_.tiptap_a]:text-accent [&_.tiptap_a]:underline
        `}
      />
    </div>
  )
}
