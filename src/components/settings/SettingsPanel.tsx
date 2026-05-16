import { useState } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { AI_MODELS, PROVIDER_PRESETS } from '@/types/ai'
import type { AIProvider } from '@/types/ai'
import { getT } from '@/i18n'
import type { Locale } from '@/i18n'

const supportsBaseUrl = (p: AIProvider) => p !== 'ollama'

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { aiConfig, updateAIConfig, editorFont, setEditorFont, editorFontSize, setEditorFontSize, locale, setLocale } = useSettingsStore()
  const t = getT(locale)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showImageApiKey, setShowImageApiKey] = useState(false)
  const models = AI_MODELS.filter(m => m.provider === aiConfig.provider)
  const needsModelText = aiConfig.provider === 'ollama' || aiConfig.provider === 'custom'

  const applyPreset = (preset: typeof PROVIDER_PRESETS[number]) => {
    updateAIConfig({
      baseUrl: preset.baseUrl,
      model: preset.models[0] ?? '',
    })
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
        background: '#ffffff',
        borderLeft: '1px solid rgba(55,53,47,0.1)',
        zIndex: 50, overflowY: 'auto',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.08)',
        animation: 'slideInRight 0.2s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(55,53,47,0.08)', marginTop: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#191919', margin: 0 }}>{t.settingsTitle}</h2>
          <button onClick={onClose}
            style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9b9a97', cursor: 'pointer', transition: 'all 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f0ef'; e.currentTarget.style.color = '#37352f' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9b9a97' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <Section title={t.sectionLanguage}>
            <Field label="">
              <div style={{ display: 'flex', gap: 6 }}>
                {(['zh', 'en'] as Locale[]).map(l => (
                  <button key={l} onClick={() => setLocale(l)} style={{
                    flex: 1, padding: '7px 0', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', transition: 'all 0.1s',
                    background: locale === l ? '#37352f' : '#ffffff',
                    border: `1px solid ${locale === l ? '#37352f' : 'rgba(55,53,47,0.18)'}`,
                    color: locale === l ? '#ffffff' : '#787672',
                  }}>
                    {l === 'zh' ? t.langZh : t.langEn}
                  </button>
                ))}
              </div>
            </Field>
          </Section>

          <Section title={t.sectionAI}>
            <Field label={t.fieldProvider}>
              <select className="input-field" value={aiConfig.provider}
                onChange={e => updateAIConfig({ provider: e.target.value as AIProvider, model: '', baseUrl: '' })}>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="custom">{t.fieldProviderCustom}</option>
                <option value="ollama">Ollama (本地)</option>
              </select>
            </Field>

            {/* Custom provider presets */}
            {aiConfig.provider === 'custom' && (
              <Field label={t.fieldPresets}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {PROVIDER_PRESETS.map(p => (
                    <button key={p.label} onClick={() => applyPreset(p)} style={{
                      padding: '4px 10px', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                      background: aiConfig.baseUrl === p.baseUrl ? '#37352f' : '#f7f6f3',
                      border: `1px solid ${aiConfig.baseUrl === p.baseUrl ? '#37352f' : 'rgba(55,53,47,0.15)'}`,
                      color: aiConfig.baseUrl === p.baseUrl ? '#fff' : '#6f6e69',
                      transition: 'all 0.1s',
                    }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {/* Base URL — always shown for custom; toggle for anthropic/openai */}
            {aiConfig.provider === 'custom' && (
              <Field label={t.fieldBaseUrl}>
                <input className="input-field"
                  style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5 }}
                  type="text"
                  value={aiConfig.baseUrl ?? ''}
                  placeholder="https://api.example.com/v1"
                  onChange={e => updateAIConfig({ baseUrl: e.target.value })}
                />
              </Field>
            )}

            {/* Base URL expand for anthropic / openai */}
            {supportsBaseUrl(aiConfig.provider) && aiConfig.provider !== 'custom' && (
              aiConfig.baseUrl !== undefined
                ? (
                  <Field label={t.fieldBaseUrl}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="input-field" style={{ flex: 1, fontFamily: 'ui-monospace, monospace', fontSize: 11.5 }}
                        type="text" value={aiConfig.baseUrl}
                        placeholder={aiConfig.provider === 'anthropic'
                          ? 'https://your-proxy.example.com'
                          : 'https://api.example.com/v1'}
                        onChange={e => updateAIConfig({ baseUrl: e.target.value })}
                      />
                      <button onClick={() => updateAIConfig({ baseUrl: undefined })}
                        style={{ flexShrink: 0, padding: '0 10px', fontSize: 11.5, color: '#9b9a97', border: '1px solid rgba(55,53,47,0.15)', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#c03030')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#9b9a97')}>
                        ✕
                      </button>
                    </div>
                  </Field>
                )
                : (
                  <button onClick={() => updateAIConfig({ baseUrl: '' })}
                    style={{ fontSize: 11.5, color: '#9b9a97', cursor: 'pointer', textAlign: 'left', transition: 'color 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#37352f')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#9b9a97')}>
                    + {t.fieldBaseUrlToggle}
                  </button>
                )
            )}

            <Field label={t.fieldModel}>
              {needsModelText ? (
                <input className="input-field" value={aiConfig.model}
                  placeholder={aiConfig.provider === 'ollama' ? 'llama3, qwen2.5...' : 'deepseek-chat, moonshot-v1-8k...'}
                  onChange={e => updateAIConfig({ model: e.target.value })} />
              ) : (
                <select className="input-field" value={aiConfig.model}
                  onChange={e => updateAIConfig({ model: e.target.value })}>
                  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
              {/* Preset model chips for custom */}
              {aiConfig.provider === 'custom' && (() => {
                const preset = PROVIDER_PRESETS.find(p => p.baseUrl === aiConfig.baseUrl)
                if (!preset || preset.models.length === 0) return null
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {preset.models.map(m => (
                      <button key={m} onClick={() => updateAIConfig({ model: m })} style={{
                        padding: '2px 8px', fontSize: 11, cursor: 'pointer',
                        background: aiConfig.model === m ? '#37352f' : '#f7f6f3',
                        border: `1px solid ${aiConfig.model === m ? '#37352f' : 'rgba(55,53,47,0.12)'}`,
                        color: aiConfig.model === m ? '#fff' : '#9b9a97',
                      }}>
                        {m.split('/').pop()}
                      </button>
                    ))}
                  </div>
                )
              })()}
            </Field>

            <Field label={
              aiConfig.provider === 'ollama' ? 'Ollama Host' :
              aiConfig.provider === 'anthropic' ? 'Anthropic API Key' :
              'API Key'
            }>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input-field"
                  style={{ flex: 1, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
                  type={aiConfig.provider === 'ollama' ? 'text' : showApiKey ? 'text' : 'password'}
                  value={aiConfig.provider === 'ollama' ? (aiConfig.ollamaHost ?? 'http://localhost:11434') : aiConfig.apiKey}
                  placeholder={aiConfig.provider === 'ollama' ? 'http://localhost:11434' : 'sk-... 或 API key'}
                  onChange={e => aiConfig.provider === 'ollama'
                    ? updateAIConfig({ ollamaHost: e.target.value })
                    : updateAIConfig({ apiKey: e.target.value })} />
                {aiConfig.provider !== 'ollama' && (
                  <button
                    type="button"
                    onClick={() => setShowApiKey(v => !v)}
                    style={{ flexShrink: 0, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(55,53,47,0.15)', background: '#f7f6f3', cursor: 'pointer', color: '#9b9a97' }}
                    title={showApiKey ? '隐藏' : '显示'}
                  >
                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
            </Field>

            <Field label={t.fieldImageGen}>
              <select className="input-field" value={aiConfig.imageProvider ?? 'openai'}
                onChange={e => updateAIConfig({ imageProvider: e.target.value as 'openai' })}>
                <option value="openai">OpenAI gpt-image-1</option>
              </select>
            </Field>

            {aiConfig.imageProvider === 'openai' && aiConfig.provider !== 'openai' && (
              <Field label={t.fieldImageApiKey}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="input-field" style={{ flex: 1, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
                    type={showImageApiKey ? 'text' : 'password'} value={aiConfig.imageApiKey ?? ''} placeholder="sk-..."
                    onChange={e => updateAIConfig({ imageApiKey: e.target.value })} />
                  <button
                    type="button"
                    onClick={() => setShowImageApiKey(v => !v)}
                    style={{ flexShrink: 0, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(55,53,47,0.15)', background: '#f7f6f3', cursor: 'pointer', color: '#9b9a97' }}
                    title={showImageApiKey ? '隐藏' : '显示'}
                  >
                    {showImageApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </Field>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label={t.fieldTemperature(aiConfig.temperature ?? 0.7)}>
                <input type="range" min={0} max={1} step={0.05} value={aiConfig.temperature ?? 0.7}
                  onChange={e => updateAIConfig({ temperature: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#37352f' }} />
              </Field>
              <Field label={t.fieldMaxTokens}>
                <input className="input-field" type="number" min={512} max={64000} step={512}
                  value={aiConfig.maxTokens ?? 8096}
                  onChange={e => updateAIConfig({ maxTokens: Number(e.target.value) })} />
              </Field>
            </div>
          </Section>

          <Section title={t.sectionEditor}>
            <Field label={t.fieldFont}>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['serif', 'sans', 'mono'] as const).map(f => (
                  <button key={f} onClick={() => setEditorFont(f)} style={{
                    flex: 1, padding: '7px 0', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', transition: 'all 0.1s',
                    background: editorFont === f ? '#37352f' : '#ffffff',
                    border: `1px solid ${editorFont === f ? '#37352f' : 'rgba(55,53,47,0.18)'}`,
                    color: editorFont === f ? '#ffffff' : '#787672',
                  }}>
                    {f === 'serif' ? t.fontSerif : f === 'sans' ? t.fontSans : t.fontMono}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t.fieldFontSize(editorFontSize)}>
              <input type="range" min={13} max={22} step={1} value={editorFontSize}
                onChange={e => setEditorFontSize(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#37352f' }} />
            </Field>
          </Section>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#b5b4b0', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid rgba(55,53,47,0.07)' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 12, color: '#9b9a97', marginBottom: 5, fontWeight: 500 }}>{label}</label>}
      {children}
    </div>
  )
}
