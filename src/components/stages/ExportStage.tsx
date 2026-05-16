import { useState } from 'react'
import { Download, FileText, Globe, BookOpen, CheckCircle, Loader2 } from 'lucide-react'
import { useBookStore } from '@/stores/bookStore'
import { exportToMarkdown, exportToDocx, exportToHTML } from '@/services/export/exportService'
import { saveProject } from '@/lib/projectIO'

type ExportFormat = 'bwk' | 'docx' | 'markdown' | 'html'

const FORMATS = [
  {
    id: 'bwk' as const,
    icon: BookOpen,
    label: 'BookWrite 项目',
    ext: '.bwk',
    desc: '保存完整项目（含 AI 配置、大纲、内容）',
    color: 'text-brand-400',
  },
  {
    id: 'docx' as const,
    icon: FileText,
    label: 'Word 文档',
    ext: '.docx',
    desc: '可在 Microsoft Word 中编辑的格式',
    color: 'text-blue-400',
  },
  {
    id: 'markdown' as const,
    icon: FileText,
    label: 'Markdown',
    ext: '.md',
    desc: '纯文本标记格式，适合发布到网络',
    color: 'text-green-400',
  },
  {
    id: 'html' as const,
    icon: Globe,
    label: 'HTML 网页',
    ext: '.html',
    desc: '带样式的网页版，可在浏览器中阅读或打印为 PDF',
    color: 'text-amber-400',
  },
]

export function ExportStage() {
  const { book } = useBookStore()
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [done, setDone] = useState<ExportFormat | null>(null)

  const totalWords = book.outline.reduce((sum, c) => sum + (c.wordCount ?? 0), 0)
  const writtenChapters = book.outline.filter((c) => c.content).length
  const totalChapters = book.outline.length

  const triggerDownload = (content: string | ArrayBuffer | Uint8Array, filename: string, mime: string) => {
    const blob = new Blob([content as BlobPart], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExport = async (format: ExportFormat) => {
    setExporting(format)
    try {
      const base = book.idea.title || 'untitled'
      if (format === 'bwk') {
        await saveProject(book)
      } else if (format === 'docx') {
        const buffer = await exportToDocx(book)
        triggerDownload(buffer, `${base}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      } else if (format === 'markdown') {
        const text = await exportToMarkdown(book)
        triggerDownload(text, `${base}.md`, 'text/markdown;charset=utf-8')
      } else if (format === 'html') {
        const html = await exportToHTML(book)
        triggerDownload(html, `${base}.html`, 'text/html;charset=utf-8')
      }
      setDone(format)
      setTimeout(() => setDone(null), 2500)
    } catch (e) {
      console.error('Export failed:', e)
      alert('导出失败: ' + String(e))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <section className="card">
          <h2 className="section-title">
            <BookOpen size={16} className="text-brand-500" />
            书籍概览
          </h2>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <StatBox label="总字数" value={totalWords.toLocaleString()} />
            <StatBox label="已完成章节" value={`${writtenChapters} / ${totalChapters}`} />
            <StatBox label="预计页数" value={`~${Math.round(totalWords / 500)}`} />
          </div>
          {totalChapters > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/40 mb-1">
                <span>写作进度</span>
                <span>{Math.round((writtenChapters / totalChapters) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${(writtenChapters / totalChapters) * 100}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Export formats */}
        <section className="card">
          <h2 className="section-title">
            <Download size={16} className="text-brand-500" />
            导出格式
          </h2>
          <div className="space-y-3 mt-4">
            {FORMATS.map((fmt) => (
              <div key={fmt.id} className="flex items-center gap-4 p-4 bg-white/3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                <fmt.icon size={22} className={fmt.color} />
                <div className="flex-1">
                  <div className="font-medium text-sm">{fmt.label}</div>
                  <div className="text-xs text-white/40 mt-0.5">{fmt.desc}</div>
                </div>
                <button
                  onClick={() => handleExport(fmt.id)}
                  disabled={!!exporting}
                  className="btn-secondary text-xs flex items-center gap-1.5 min-w-20 justify-center"
                >
                  {exporting === fmt.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : done === fmt.id ? (
                    <><CheckCircle size={12} className="text-green-400" />完成</>
                  ) : (
                    <><Download size={12} />导出</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Chapter checklist */}
        {book.outline.length > 0 && (
          <section className="card">
            <h2 className="section-title">章节状态</h2>
            <div className="space-y-1 mt-3">
              {book.outline.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-1.5 text-sm">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.content ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className="text-white/50 w-10 flex-shrink-0">第{c.number}章</span>
                  <span className="flex-1 truncate text-white/80">{c.title}</span>
                  <span className="text-xs text-white/30">{c.wordCount ? `${c.wordCount}字` : '未写'}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/3 rounded-xl p-4 text-center border border-white/5">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
    </div>
  )
}
