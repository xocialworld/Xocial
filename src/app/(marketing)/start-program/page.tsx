'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'


export default function StartProgramPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    try {
      const res = await fetch('/api/feature-waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name, feature: 'start-program' }) })
      if (!res.ok) throw new Error('Failed')
      setStatus('success')
      setEmail('')
      setName('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-secondary-900 mb-8">Start Program</h1>
      <p className="text-secondary-700 mb-6">Sign up for early access and guided onboarding.</p>
      <form onSubmit={submit} aria-label="Start program form" className="grid gap-4">
        <div>
          <label className="block text-sm text-secondary-700 mb-1">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required aria-label="Name" />
        </div>
        <div>
          <label className="block text-sm text-secondary-700 mb-1">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Email" />
        </div>
        <Button type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'Submitting…' : 'Join program'}</Button>
        {status === 'success' && <p role="status" className="text-success-700">Thanks! We’ll be in touch.</p>}
        {status === 'error' && <p role="alert" className="text-destructive-700">Something went wrong. Try again.</p>}
      </form>
    </div>
  )
}

