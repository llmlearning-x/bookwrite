import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { getT } from '@/i18n'
import { BookBuddyLogo } from '@/components/studio/PixelArt'

const APP_VERSION = '0.1.0'

export function LoginScreen() {
  const [mode, setMode]       = useState<'login' | 'register'>('login')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const { signIn, signUp, loading, error, clearError } = useAuthStore()
  const { locale } = useSettingsStore()
  const t = getT(locale)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (!email.trim()) {
      setLocalError(t.errorEmailRequired)
      return
    }
    if (!password.trim()) {
      setLocalError(t.errorPasswordRequired)
      return
    }
    if (mode === 'login') await signIn(email, password)
    else await signUp(email, password)
  }

  const switchMode = () => { clearError(); setLocalError(null); setMode(m => m === 'login' ? 'register' : 'login') }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f7f6f3',
    }}>
      {/* macOS traffic-light region */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 44, WebkitAppRegion: 'drag' } as React.CSSProperties} />

      <div style={{
        width: 380, background: '#ffffff',
        border: '1px solid rgba(55,53,47,0.1)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.07)',
        padding: '40px 36px 36px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <BookBuddyLogo size={48} />
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#191919', letterSpacing: '-0.01em' }}>
              BookBuddy
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '1px 5px', border: '1px solid rgba(55,53,47,0.25)', color: '#9b9a97',
            }}>
              BETA
            </span>
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: '#c7c6c2' }}>
            {t.loginSubtitle}  ·  v{APP_VERSION}
          </div>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(55,53,47,0.08)', marginBottom: 24 }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { clearError(); setMode(m) }} style={{
              flex: 1, paddingBottom: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              color: mode === m ? '#37352f' : '#9b9a97',
              borderBottom: `2px solid ${mode === m ? '#37352f' : 'transparent'}`,
              marginBottom: -1, transition: 'all 0.15s',
            }}>
              {m === 'login' ? t.tabLogin : t.tabRegister}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, color: '#9b9a97', marginBottom: 5, fontWeight: 500 }}>
              {t.loginEmail}
            </label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field"
              style={{ width: '100%' }}
              autoComplete="email"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, color: '#9b9a97', marginBottom: 5, fontWeight: 500 }}>
              {t.loginPassword}
            </label>
            <input
              type="password" required value={password} onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              style={{ width: '100%' }}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {(localError || error) && (
            <div style={{
              fontSize: 12, color: '#c03030', padding: '8px 12px',
              background: '#fff5f5', border: '1px solid rgba(200,50,50,0.15)',
            }}>
              {localError || error}
            </div>
          )}

          {mode === 'register' && (
            <div style={{ fontSize: 11.5, color: '#9b9a97', lineHeight: 1.6, padding: '8px 0' }}>
              {t.registerNote}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
            {loading
              ? (mode === 'login' ? t.loginLoading : t.registerLoading)
              : (mode === 'login' ? t.tabLogin : t.tabRegister)
            }
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: '#c7c6c2', lineHeight: 1.6 }}>
          {t.privacyNote}
        </div>
      </div>
    </div>
  )
}
