import { useState, useCallback, useEffect } from 'react'
import { Settings, Save, PanelLeftClose, PanelLeft, FilePlus, FolderOpen, ChevronLeft, Cloud, CloudOff, Loader2 } from 'lucide-react'
import { useBookStore } from '@/stores/bookStore'
import { useAgentStore } from '@/stores/agentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { useLibraryStore } from '@/stores/libraryStore'
import { getT } from '@/i18n'
import { ChapterSidebar } from './ChapterSidebar'
import { WritingCanvas } from './WritingCanvas'
import { AgentPanel } from './AgentPanel'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { BookBuddyLogo } from './PixelArt'
import { saveProject, openProject } from '@/lib/projectIO'

const APP_VERSION = '0.1.0'

export function StudioShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const { book, isDirty, newBook } = useBookStore()
  const { clear } = useAgentStore()
  const { locale } = useSettingsStore()
  const { user } = useAuthStore()
  const { closeBook, updateBookInList, syncStatus } = useLibraryStore()
  const t = getT(locale)

  const initials = user?.email ? user.email[0].toUpperCase() : '?'

  // Auto-sync on book change
  useEffect(() => {
    if (isDirty && user) {
      updateBookInList(book, user.id)
    }
  }, [book, isDirty])

  const handleNew = useCallback(() => {
    if (isDirty && !confirm(t.confirmNew)) return
    newBook(); clear()
  }, [isDirty, newBook, clear])

  const handleOpen = useCallback(async () => {
    await openProject(); clear()
  }, [clear])

  return (
    <div className="studio-root">
      <div className="fixed top-0 left-0 right-0 h-8 app-drag-region z-50 pointer-events-none" />

      {/* Header */}
      <header className="studio-header app-drag-region">
        {/* Left */}
        <div style={{ display:'flex', alignItems:'center', gap:2, paddingLeft:80 }}>
          {/* Back to library */}
          {user && (
            <button onClick={closeBook} className="icon-btn no-drag" title={t.backToLibrary}
              style={{ display:'flex', alignItems:'center', gap:4, paddingRight:6, fontSize:11.5, color:'rgba(55,53,47,0.4)', width:'auto' }}>
              <ChevronLeft size={13}/>
              <span>{t.backToLibrary}</span>
            </button>
          )}
          <div style={{ width:1, height:14, background:'rgba(55,53,47,0.1)', margin:'0 6px' }} />
          {/* Logo */}
          <div className="no-drag" style={{ display:'flex', alignItems:'center', gap:7, marginRight:8 }}>
            <BookBuddyLogo size={20} />
            <span style={{ fontSize:12.5, fontWeight:700, color:'#37352f', letterSpacing:'-0.01em', userSelect:'none' }}>
              BookBuddy
            </span>
            <span style={{
              fontSize:8.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
              padding:'1px 4px', border:'1px solid rgba(55,53,47,0.22)', color:'#b5b4b0',
            }}>
              BETA
            </span>
          </div>
          <div style={{ width:1, height:14, background:'rgba(55,53,47,0.1)', marginRight:4 }} />
          <button onClick={() => setSidebarOpen(v => !v)} className="icon-btn no-drag"
            title={sidebarOpen ? t.tooltipCollapse : t.tooltipExpand}>
            {sidebarOpen ? <PanelLeftClose size={14}/> : <PanelLeft size={14}/>}
          </button>
          <button onClick={handleNew}  className="icon-btn no-drag" title={t.tooltipNew}><FilePlus  size={14}/></button>
          <button onClick={handleOpen} className="icon-btn no-drag" title={t.tooltipOpen}><FolderOpen size={14}/></button>
        </div>

        {/* Center — current book title */}
        <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:8, pointerEvents:'none', maxWidth:300 }}>
          <span style={{ fontSize:13, fontWeight:500, color:'#9b9a97', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {book.idea.title || t.untitledBook}
          </span>
          {isDirty && <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(55,53,47,0.3)', flexShrink:0 }} />}
        </div>

        {/* Right */}
        <div style={{ display:'flex', alignItems:'center', gap:6, paddingRight:16 }}>
          {/* Sync status */}
          {user && (
            <div style={{ display:'flex', alignItems:'center', gap:4, marginRight:4 }}>
              {syncStatus === 'syncing' && <Loader2 size={12} style={{ animation:'spin 1s linear infinite', color:'#9b9a97' }} />}
              {syncStatus === 'synced'  && <Cloud size={12} style={{ color:'#b5b4b0' }} />}
              {syncStatus === 'error'   && <CloudOff size={12} style={{ color:'#c03030' }} />}
              {syncStatus === 'idle'    && <Cloud size={12} style={{ color:'#c7c6c2' }} />}
            </div>
          )}
          {isDirty && (
            <button onClick={() => saveProject(book)} className="icon-btn no-drag" title={t.tooltipSave}>
              <Save size={14}/>
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="icon-btn no-drag" title={t.tooltipSettings}>
            <Settings size={14}/>
          </button>
          {/* User avatar */}
          {user && (
            <div style={{
              width:24, height:24, background:'#37352f', color:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:700, userSelect:'none', flexShrink:0,
            }}>
              {initials}
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="studio-body">
        <aside className={`studio-sidebar ${sidebarOpen ? 'sidebar-visible' : 'sidebar-hidden'}`}>
          <ChapterSidebar />
        </aside>
        <div className="studio-main">
          <WritingCanvas />
          <AgentPanel />
        </div>
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}
