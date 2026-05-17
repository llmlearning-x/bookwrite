import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square, Users, Globe, Trash2, ChevronDown, ChevronUp, Plus, History, X } from 'lucide-react'
import { useAgentStore } from '@/stores/agentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useBookStore } from '@/stores/bookStore'
import { runAgent } from '@/services/ai/agent'
import { setCanvasStream, clearCanvasStream } from './WritingCanvas'
import { PixelStar, PixelCheck, PixelX, PixelLoader } from './PixelArt'
import { getT } from '@/i18n'
import type { Character, WorldNote } from '@/types/book'
import type { AgentSession } from '@/stores/agentStore'

function ThinkingBlock({ content, label }: { content: string; label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 6 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          fontSize: 11,
          color: '#b5b4b0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: 0,
        }}
      >
        <span style={{
          display: 'inline-block',
          fontSize: 8,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
        }}>▶</span>
        {label}
      </button>
      {open && (
        <div style={{
          marginTop: 6,
          padding: '8px 10px',
          background: '#f5f5f5',
          borderRadius: 4,
          fontSize: 11.5,
          lineHeight: 1.6,
          color: '#888',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {content}
        </div>
      )}
    </div>
  )
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function SessionList({ sessions, currentId, onSwitch, onClose }: {
  sessions: AgentSession[]
  currentId: string
  onSwitch: (id: string) => void
  onClose: () => void
}) {
  if (sessions.length === 0) {
    return (
      <div style={{
        position: 'absolute', top: 40, right: 0, left: 0, zIndex: 10,
        background: '#fff', borderBottom: '1px solid rgba(55,53,47,0.1)',
        padding: '20px 16px', textAlign: 'center',
        fontSize: 12, color: '#b5b4b0',
      }}>
        暂无历史对话
        <button onClick={onClose} style={{ position: 'absolute', top: 8, right: 12, cursor: 'pointer', color: '#b5b4b0', background: 'none', border: 'none' }}>
          <X size={14} />
        </button>
      </div>
    )
  }
  return (
    <div style={{
      position: 'absolute', top: 40, right: 0, left: 0, zIndex: 10,
      background: '#fff', borderBottom: '1px solid rgba(55,53,47,0.1)',
      maxHeight: 300, overflowY: 'auto',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid rgba(55,53,47,0.07)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9b9a97' }}>历史对话</span>
        <button onClick={onClose} style={{ cursor: 'pointer', color: '#b5b4b0', background: 'none', border: 'none', display: 'flex' }}>
          <X size={13} />
        </button>
      </div>
      {sessions.map(s => (
        <button
          key={s.id}
          onClick={() => { onSwitch(s.id); onClose() }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '9px 14px', textAlign: 'left',
            background: s.id === currentId ? '#f7f6f3' : 'transparent',
            border: 'none', borderBottom: '1px solid rgba(55,53,47,0.05)',
            cursor: 'pointer', gap: 8,
          }}
          onMouseEnter={e => { if (s.id !== currentId) e.currentTarget.style.background = '#f7f6f3' }}
          onMouseLeave={e => { if (s.id !== currentId) e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{ fontSize: 12.5, color: '#37352f', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.title}
          </span>
          <span style={{ fontSize: 10.5, color: '#b5b4b0', flexShrink: 0 }}>{formatTime(s.createdAt)}</span>
        </button>
      ))}
    </div>
  )
}

type PanelTab = 'chat' | 'knowledge'

export function AgentPanel() {
  const [input, setInput]         = useState('')
  const [tab, setTab]             = useState<PanelTab>('chat')
  const [showHistory, setShowHistory] = useState(false)
  const endRef                    = useRef<HTMLDivElement>(null)

  const { messages, sessions, currentSessionId, isThinking, activeSkills, checkpoint, setCheckpoint, addUserMessage, addAssistantMessage, createAbortController, abort, newSession, switchSession } = useAgentStore()
  const { aiConfig, locale } = useSettingsStore()
  const { book, removeCharacter, removeWorldNote } = useBookStore()
  const t = getT(locale)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || isThinking) return
    setInput('')
    setTab('chat')
    setShowHistory(false)
    addUserMessage(msg)
    const aid = addAssistantMessage('')
    const ctrl = createAbortController()
    const history = useAgentStore.getState().messages
      .slice(-12)
      .filter(m => m.role !== 'assistant' || m.content.trim() !== '')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    try {
      await runAgent(msg, aiConfig, history, (id, text, done) => done ? clearCanvasStream() : setCanvasStream(id, text), aid, ctrl.signal)
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        useAgentStore.getState().updateAssistantMessage(aid, (useAgentStore.getState().messages.find(m => m.id === aid)?.content || '') + '\n\n⏹ ' + t.interrupted)
      }
    }
  }, [input, isThinking, aiConfig, addUserMessage, addAssistantMessage, createAbortController, t])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const running = activeSkills.find(s => s.status === 'running')
  const recent  = activeSkills.slice(-6)
  const chars   = book.knowledge?.characters ?? []
  const notes   = book.knowledge?.worldNotes ?? []

  return (
    <div className="agent-panel" style={{ position: 'relative' }}>

      {/* Panel header with tabs */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 10px 0 14px',
        borderBottom: '1px solid rgba(55,53,47,0.08)',
        flexShrink: 0,
        height: 38,
        marginTop: 44,
      }}>
        <TabBtn active={tab === 'chat'} onClick={() => { setTab('chat'); setShowHistory(false) }} icon={<PixelStar size={8} color="currentColor" />} label="AI 助手" />
        <TabBtn
          active={tab === 'knowledge'}
          onClick={() => { setTab('knowledge'); setShowHistory(false) }}
          icon={<Users size={11} />}
          label={`知识库${chars.length + notes.length > 0 ? ` · ${chars.length + notes.length}` : ''}`}
        />
        <div style={{ flex: 1 }} />
        {/* History button */}
        <button
          onClick={() => setShowHistory(v => !v)}
          title="历史对话"
          style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: showHistory ? '#37352f' : '#b5b4b0', cursor: 'pointer', borderRadius: 3,
            background: showHistory ? 'rgba(55,53,47,0.08)' : 'none', border: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#37352f'; e.currentTarget.style.background = 'rgba(55,53,47,0.06)' }}
          onMouseLeave={e => { if (!showHistory) { e.currentTarget.style.color = '#b5b4b0'; e.currentTarget.style.background = 'none' } }}
        >
          <History size={13} />
        </button>
        {/* New chat button */}
        <button
          onClick={() => { newSession(); setTab('chat'); setShowHistory(false) }}
          disabled={isThinking}
          title="新建对话"
          style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#b5b4b0', cursor: 'pointer', borderRadius: 3,
            background: 'none', border: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#37352f'; e.currentTarget.style.background = 'rgba(55,53,47,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#b5b4b0'; e.currentTarget.style.background = 'none' }}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* History dropdown */}
      {showHistory && (
        <SessionList
          sessions={sessions}
          currentId={currentSessionId}
          onSwitch={switchSession}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Chat tab */}
      {tab === 'chat' && (
        <>
          {/* Messages */}
          <div className="agent-messages">
            {messages.length === 0 ? (
              <div className="quick-prompts" style={{ padding: '12px 0 4px' }}>
                {t.quickPrompts.map((qp: { label: string; prompt: string }) => (
                  <button key={qp.label} onClick={() => send(qp.prompt)}
                    disabled={isThinking || !!checkpoint} className="quick-prompt-btn">
                    <PixelStar size={8} color="currentColor" />
                    {qp.label}
                  </button>
                ))}
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`agent-msg ${msg.role === 'user' ? 'agent-msg-user' : 'agent-msg-ai'}`}>
                  {msg.role === 'assistant' && (
                    <div className="ai-label">
                      <PixelStar size={8} color="#9b9a97" />
                      {t.agentLabel}
                    </div>
                  )}
                  <p>{msg.content || (msg.role === 'assistant' ? '…' : '')}</p>
                  {msg.role === 'assistant' && msg.reasoningContent && (
                    <ThinkingBlock content={msg.reasoningContent} label={t.thinkingProcess} />
                  )}
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {/* Skill badges */}
          {recent.length > 0 && (
            <div className="skill-badges">
              {recent.map(sk => (
                <span key={sk.id} className={`skill-badge skill-badge-${sk.status}`}>
                  {sk.status === 'running' && <PixelLoader size={10} />}
                  {sk.status === 'done'    && <PixelCheck size={9} color="#9b9a97" />}
                  {sk.status === 'error'   && <PixelX size={9} color="#e03e3e" />}
                  {sk.label}
                  {sk.status === 'done' && sk.summary && (
                    <span style={{ color: '#b5b4b0', marginLeft: 4, fontSize: 10.5 }}>
                      {sk.summary.slice(0, 40)}{sk.summary.length > 40 ? '…' : ''}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Checkpoint */}
          {checkpoint && (
            <div className="checkpoint-bar" style={{ margin: '0 14px 6px', padding: '8px 12px', background: '#fff', border: '1px solid rgba(55,53,47,0.12)' }}>
              <span style={{ fontSize: 11.5, color: '#6f6e69' }}>
                {checkpoint.autoResend ? '当前章节已完成，继续写下一章？' : '当前步骤已完成，继续下一步？'}
              </span>
              <button
                onClick={() => {
                  const cp = checkpoint
                  setCheckpoint(null)
                  cp?.resume()
                  if (cp?.autoResend) {
                    const autoMsg = cp.autoResend
                    const waitAndSend = () => {
                      if (useAgentStore.getState().isThinking) {
                        setTimeout(waitAndSend, 150)
                      } else {
                        send(autoMsg)
                      }
                    }
                    setTimeout(waitAndSend, 300)
                  }
                }}
                className="checkpoint-btn">
                <PixelCheck size={9} color="#fff" />
                {checkpoint.autoResend ? '写下一章' : '继续'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Knowledge tab */}
      {tab === 'knowledge' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          <KnowledgeSection
            title="人物"
            icon={<Users size={11} />}
            count={chars.length}
            onAdd={() => send('请帮我添加一个新人物到知识库')}
          >
            {chars.length === 0 ? (
              <EmptyHint>告诉 AI 角色信息，会自动建立人物卡</EmptyHint>
            ) : chars.map(c => (
              <CharCard key={c.id} char={c} onDelete={() => removeCharacter(c.id)} />
            ))}
          </KnowledgeSection>

          <KnowledgeSection
            title="世界观"
            icon={<Globe size={11} />}
            count={notes.length}
            onAdd={() => send('请帮我添加一条世界观设定到知识库')}
          >
            {notes.length === 0 ? (
              <EmptyHint>告诉 AI 世界设定，会自动记录</EmptyHint>
            ) : notes.map(n => (
              <NoteCard key={n.id} note={n} onDelete={() => removeWorldNote(n.id)} />
            ))}
          </KnowledgeSection>
        </div>
      )}

      {/* Input — always visible */}
      <div className="agent-input-row">
        <div className="agent-input-box">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={isThinking}
            placeholder={
              isThinking
                ? running ? `${running.label}…` : t.thinking
                : t.agentPlaceholder
            }
            rows={1}
            className="agent-textarea"
          />
          <button
            onClick={() => isThinking ? abort() : send()}
            disabled={!isThinking && !input.trim()}
            className="agent-send-btn"
            title={isThinking ? t.stop : t.send}
          >
            {isThinking ? <Square size={14} fill="currentColor" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '0 10px', height: '100%',
      fontSize: 11.5, fontWeight: active ? 600 : 400,
      color: active ? '#37352f' : '#9b9a97',
      borderBottom: `2px solid ${active ? '#37352f' : 'transparent'}`,
      marginBottom: -1, cursor: 'pointer', transition: 'all 0.12s',
    }}>
      {icon}{label}
    </button>
  )
}

function KnowledgeSection({ title, icon, count, children, onAdd }: {
  title: string; icon: React.ReactNode; count: number; children: React.ReactNode; onAdd: () => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <button onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, cursor: 'pointer' }}>
          {open ? <ChevronDown size={11} style={{ color: '#9b9a97' }} /> : <ChevronUp size={11} style={{ color: '#9b9a97' }} />}
          {icon}
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9b9a97' }}>
            {title}
          </span>
          {count > 0 && <span style={{ fontSize: 10, color: '#c7c6c2' }}>{count}</span>}
        </button>
        <button onClick={onAdd} style={{ fontSize: 11, color: '#b5b4b0', cursor: 'pointer', padding: '2px 6px' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#37352f')}
          onMouseLeave={e => (e.currentTarget.style.color = '#b5b4b0')}>
          + 添加
        </button>
      </div>
      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>}
    </div>
  )
}

const ROLE_LABEL: Record<string, string> = {
  protagonist: '主角', antagonist: '反派', supporting: '配角', minor: '次要',
}

function CharCard({ char, onDelete }: { char: Character; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(55,53,47,0.1)', padding: '8px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => setExpanded(v => !v)} style={{ flex: 1, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#37352f' }}>{char.name}</span>
          <span style={{ fontSize: 10, color: '#b5b4b0', padding: '1px 5px', border: '1px solid rgba(55,53,47,0.12)' }}>
            {ROLE_LABEL[char.role] ?? char.role}
          </span>
        </button>
        <button onClick={onDelete} style={{ color: '#c7c6c2', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#c03030')}
          onMouseLeave={e => (e.currentTarget.style.color = '#c7c6c2')}>
          <Trash2 size={11} />
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: '#6f6e69', lineHeight: 1.7 }}>
          {char.description && <div><span style={{ color: '#9b9a97' }}>外貌：</span>{char.description}</div>}
          {char.personality && <div><span style={{ color: '#9b9a97' }}>性格：</span>{char.personality}</div>}
          {char.arc && <div><span style={{ color: '#9b9a97' }}>弧线：</span>{char.arc}</div>}
        </div>
      )}
    </div>
  )
}

const NOTE_CATEGORY_LABEL: Record<string, string> = {
  setting: '场景', rule: '规则', history: '历史', technology: '技术', culture: '文化', other: '其他',
}

function NoteCard({ note, onDelete }: { note: WorldNote; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(55,53,47,0.1)', padding: '8px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => setExpanded(v => !v)} style={{ flex: 1, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#b5b4b0', padding: '1px 5px', border: '1px solid rgba(55,53,47,0.12)', flexShrink: 0 }}>
            {NOTE_CATEGORY_LABEL[note.category] ?? note.category}
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#37352f' }}>{note.title}</span>
        </button>
        <button onClick={onDelete} style={{ color: '#c7c6c2', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#c03030')}
          onMouseLeave={e => (e.currentTarget.style.color = '#c7c6c2')}>
          <Trash2 size={11} />
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: '#6f6e69', lineHeight: 1.6 }}>{note.content}</div>
      )}
    </div>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11.5, color: '#c7c6c2', padding: '6px 2px', lineHeight: 1.6 }}>{children}</div>
  )
}
