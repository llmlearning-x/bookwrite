import { useState } from 'react'
import { BookOpen, PenLine, Image, Download, Settings, Plus, FolderOpen } from 'lucide-react'
import { useBookStore } from '@/stores/bookStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { IdeaStage } from '@/components/stages/IdeaStage'
import { OutlineStage } from '@/components/stages/OutlineStage'
import { WritingStage } from '@/components/stages/WritingStage'
import { VisualStage } from '@/components/stages/VisualStage'
import { ExportStage } from '@/components/stages/ExportStage'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { saveProject, openProject } from '@/lib/projectIO'

type View = 'idea' | 'outline' | 'writing' | 'visual' | 'export' | 'settings'

const NAV_ITEMS = [
  { id: 'idea', icon: BookOpen, label: '创意', title: '书籍创意' },
  { id: 'outline', icon: PenLine, label: '大纲', title: '章节大纲' },
  { id: 'writing', icon: PenLine, label: '写作', title: 'AI 写作' },
  { id: 'visual', icon: Image, label: '视觉', title: 'AI 配图' },
  { id: 'export', icon: Download, label: '导出', title: '导出成书' },
] as const

export function AppShell() {
  const [view, setView] = useState<View>('idea')
  const [showSettings, setShowSettings] = useState(false)
  const { book, isDirty, newBook } = useBookStore()
  const { theme } = useSettingsStore()

  const handleNew = () => {
    if (isDirty && !confirm('当前书籍未保存，确定新建？')) return
    newBook()
    setView('idea')
  }

  const handleOpen = async () => {
    await openProject()
    setView('idea')
  }

  const handleSave = () => saveProject(book)

  return (
    <div className={`flex h-screen bg-surface-950 text-white ${theme === 'light' ? 'light-mode' : ''}`}>
      {/* macOS traffic light spacer */}
      <div className="fixed top-0 left-0 right-0 h-8 app-drag-region z-50" />

      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center bg-surface-900 border-r border-white/5 pt-10 pb-4 z-10">
        {/* Logo */}
        <div className="mb-6 w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <BookOpen size={18} className="text-white" />
        </div>

        {/* New / Open */}
        <button
          onClick={handleNew}
          className="sidebar-btn mb-1"
          title="新建书籍"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={handleOpen}
          className="sidebar-btn mb-4"
          title="打开书籍"
        >
          <FolderOpen size={18} />
        </button>

        <div className="w-8 h-px bg-white/10 mb-4" />

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id as View)}
              className={`sidebar-btn flex-col gap-0.5 ${view === id ? 'sidebar-btn-active' : ''}`}
              title={label}
            >
              <Icon size={18} />
              <span className="text-[9px] leading-none opacity-70">{label}</span>
            </button>
          ))}
        </nav>

        {/* Save indicator */}
        {isDirty && (
          <button
            onClick={handleSave}
            className="w-2 h-2 rounded-full bg-amber-400 mb-2 animate-pulse-slow"
            title="有未保存更改，点击保存"
          />
        )}

        <button
          onClick={() => setShowSettings(true)}
          className="sidebar-btn"
          title="设置"
        >
          <Settings size={18} />
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden pt-8">
        {/* Header */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3">
          <h1 className="text-sm font-medium text-white/80">
            {NAV_ITEMS.find((n) => n.id === view)?.title ?? '设置'}
          </h1>
          {book.idea.title && (
            <>
              <span className="text-white/30">—</span>
              <span className="text-sm text-white/50 truncate max-w-xs">{book.idea.title}</span>
            </>
          )}
          <div className="flex-1" />
          <StatusBadge />
        </div>

        {/* Stage content */}
        <div className="flex-1 overflow-hidden">
          {view === 'idea' && <IdeaStage />}
          {view === 'outline' && <OutlineStage onGoToWriting={() => setView('writing')} />}
          {view === 'writing' && <WritingStage />}
          {view === 'visual' && <VisualStage />}
          {view === 'export' && <ExportStage />}
        </div>
      </main>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}

function StatusBadge() {
  const { book } = useBookStore()
  const labels: Record<string, string> = {
    idea: '创意阶段',
    outline: '大纲阶段',
    writing: '写作中',
    editing: '编辑中',
    complete: '已完成',
  }
  const colors: Record<string, string> = {
    idea: 'bg-purple-500/20 text-purple-300',
    outline: 'bg-blue-500/20 text-blue-300',
    writing: 'bg-green-500/20 text-green-300',
    editing: 'bg-amber-500/20 text-amber-300',
    complete: 'bg-emerald-500/20 text-emerald-300',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[book.status] ?? ''}`}>
      {labels[book.status]}
    </span>
  )
}
