import { useEffect, useRef } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Typography from '@tiptap/extension-typography'
import { Bold, Italic, Strikethrough, Heading2, Heading3, List, ListOrdered, Quote } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'

const FONTS: Record<string, string> = {
  sans:  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'Georgia, "Noto Serif SC", "Songti SC", "SimSun", serif',
  mono:  '"JetBrains Mono", "Fira Code", monospace',
}

interface Props {
  content: string
  onChange: (text: string) => void
  placeholder?: string
  readOnly?: boolean
}

export function RichEditor({ content, onChange, placeholder, readOnly }: Props) {
  const { editorFont, editorFontSize } = useSettingsStore()
  // Tracks the last value we pushed into the editor externally,
  // so we never reset content that the user is actively typing.
  const lastSetRef = useRef<string>(content ?? '')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing...' }),
      CharacterCount,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      lastSetRef.current = html
      onChange(html)
    },
    editorProps: {
      attributes: {
        class: 'prose-editor',
        style: [
          `font-family: ${FONTS[editorFont] ?? FONTS.serif}`,
          `font-size: ${editorFontSize}px`,
        ].join('; '),
      },
    },
  })

  useEffect(() => {
    if (editor && content !== lastSetRef.current) {
      // Migrate plain-text content (written before HTML conversion) on load
      let html = content ?? ''
      if (html && !html.trimStart().startsWith('<')) {
        html = html
          .split('\n\n')
          .map(p => p.trim())
          .filter(p => p.length > 0)
          .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
          .join('')
      }
      lastSetRef.current = html
      editor.commands.setContent(html || '', false)
    }
  }, [content, editor])

  if (!editor) return null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!readOnly && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100, placement: 'top' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 1,
            background: '#191919',
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '4px 5px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          }}>
            {[
              { Icon: Bold,         run: () => editor.chain().focus().toggleBold().run(),              active: editor.isActive('bold') },
              { Icon: Italic,       run: () => editor.chain().focus().toggleItalic().run(),            active: editor.isActive('italic') },
              { Icon: Strikethrough,run: () => editor.chain().focus().toggleStrike().run(),            active: editor.isActive('strike') },
            ].map(({ Icon, run, active }, i) => (
              <BubbleBtn key={i} onClick={run} active={active}><Icon size={13} /></BubbleBtn>
            ))}
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', margin: '0 3px' }} />
            {[
              { Icon: Heading2,    run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
              { Icon: Heading3,    run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
              { Icon: List,        run: () => editor.chain().focus().toggleBulletList().run(),          active: editor.isActive('bulletList') },
              { Icon: ListOrdered, run: () => editor.chain().focus().toggleOrderedList().run(),         active: editor.isActive('orderedList') },
              { Icon: Quote,       run: () => editor.chain().focus().toggleBlockquote().run(),          active: editor.isActive('blockquote') },
            ].map(({ Icon, run, active }, i) => (
              <BubbleBtn key={i} onClick={run} active={active}><Icon size={13} /></BubbleBtn>
            ))}
          </div>
        </BubbleMenu>
      )}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <EditorContent editor={editor} style={{ height: '100%' }} />
      </div>
    </div>
  )
}

function BubbleBtn({ onClick, active, children }: { onClick: () => void; active: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        color: active ? '#ffffff' : 'rgba(255,255,255,0.55)',
        cursor: 'pointer', transition: 'all 0.1s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}
