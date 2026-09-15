import { useState } from 'react'
import { useAuth } from '../auth'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { Card, SectionHeading } from './ui/Card'
import { Button } from './ui/Button'

export function AccountSection() {
  const { session, sendMagicLink, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  if (!isSupabaseConfigured) return null

  async function handleSend() {
    if (!email.trim()) return
    setStatus('sending')
    const { error } = await sendMagicLink(email.trim())
    if (error) {
      setErrorMessage(error)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  return (
    <section>
      <SectionHeading>Account</SectionHeading>
      <Card padding="p-4">
        {session ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-subhead label">{session.user.email}</p>
              <p className="text-footnote" style={{ color: 'var(--good)' }}>
                Synced across devices
              </p>
            </div>
            <Button variant="destructive" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        ) : status === 'sent' ? (
          <p className="text-subhead label-secondary">Check {email} for a sign-in link.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-subhead label-secondary">Sign in to sync your data across devices.</p>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 min-w-0 text-body rounded-xl px-3 py-2.5"
                style={{ background: 'var(--fill-secondary)', minHeight: 44 }}
              />
              <Button variant="secondary" onClick={handleSend} disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send Link'}
              </Button>
            </div>
            {status === 'error' && (
              <p className="text-footnote" style={{ color: 'var(--critical)' }}>
                {errorMessage}
              </p>
            )}
          </div>
        )}
      </Card>
    </section>
  )
}
