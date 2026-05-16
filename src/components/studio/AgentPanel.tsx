import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, ChevronUp, ChevronDown, Square } from 'lucide-react'
import { useAgentStore } from '@/stores/agentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { runAgent } from '@/services/ai/agent'
import { setCanvasStream } from './WritingCanvas'
import { PixelStar, PixelCheck, PixelX, PixelLoader } from './PixelArt'
import { getT } from '@/i18n'

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

export function AgentPanel() {
  const [input, setInput]       = useState('')
  const [histOpen, setHistOpen] = useState(false)
  const endRef                  = useRef<HTMLDivElement>(null)

  const { messages, isThinking, activeSkills, addUserMessage, addAssistantMessage, createAbortController, abort } = useAgentStore()
  const { aiConfig, locale } = useSettingsStore()
  const t = getT(locale)

  useEffect(() => {
    if (histOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, histOpen])

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || isThinking) return
    setInput('')
    addUserMessage(msg)
    const aid = addAssistantMessage('')
    setHistOpen(true)
    const ctrl = createAbortController()
    const history = useAgentStore.getState().messages
      .slice(-12)
      .filter(m => m.role !== 'assistant' || m.content.trim() !== '')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    try {
      await runAgent(msg, aiConfig, history, (id, text) => setCanvasStream(id, text), aid, ctrl.signal)
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

  return (
    <div className="agent-panel">

      {/* History */}
      {histOpen && messages.length > 0 && (
        <div className="agent-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`agent-msg ${msg.role === 'user' ? 'agent-msg-user' : 'agent-msg-ai'}`}>
              {msg.role === 'assistant' && (
                <div className="ai-label">
                  <PixelStar size={8} color="#9b9a97" />
                  {t.agentLabel}
                </div>
              )}
              <p>{msg.content || (msg.role === 'assistant' ? '...' : '')}</p>
              {msg.role === 'assistant' && msg.reasoningContent && (
                <ThinkingBlock content={msg.reasoningContent} label={t.thinkingProcess} />
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

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
                  {sk.summary.slice(0, 20)}{sk.summary.length > 20 ? '…' : ''}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="quick-prompts">
          {t.quickPrompts.map((qp: { label: string; prompt: string }) => (
            <button
              key={qp.label}
              onClick={() => send(qp.prompt)}
              disabled={isThinking}
              className="quick-prompt-btn"
            >
              <PixelStar size={8} color="currentColor" />
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="agent-input-row">
        {messages.length > 0 && (
          <button
            onClick={() => setHistOpen(v => !v)}
            style={{ flexShrink: 0, fontSize: 11, color: '#b5b4b0', display: 'flex', alignItems: 'center', gap: 3, paddingBottom: 2, cursor: 'pointer', transition: 'color 0.1s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#37352f')}
            onMouseLeave={e => (e.currentTarget.style.color = '#b5b4b0')}
          >
            {histOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            {messages.length}
          </button>
        )}

        <div className="agent-input-box">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={isThinking}
            placeholder={
              isThinking
                ? running ? `${running.label}...` : t.thinking
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
            {isThinking
              ? <Square size={14} fill="currentColor" />
              : <Send size={14} />
            }
          </button>
        </div>
      </div>
    </div>
  )
}
