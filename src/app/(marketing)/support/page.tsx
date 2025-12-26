'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Mail, MessageSquare, Phone } from 'lucide-react'

export default function SupportPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    // Simulated delay
    setTimeout(() => {
      setStatus('success')
      setName('')
      setEmail('')
      setMessage('')
    }, 1000)

    // In real app:
    // try {
    //   const res = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, message }) })
    //   if (!res.ok) throw new Error('Failed')
    //   setStatus('success')
    // } catch {
    //   setStatus('error')
    // }
  }

  return (
    <div className="pb-20">
      <div className="bg-secondary-900 text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-6">How can we help?</h1>
        <p className="text-xl text-secondary-300 mb-8 max-w-2xl mx-auto">
          Our team is here to answer your questions and get you back on track.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-2">

          {/* Contact Info */}
          <div className="bg-secondary-50 p-12">
            <h2 className="text-2xl font-bold text-secondary-900 mb-6">Get in touch</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><MessageSquare className="h-6 w-6" /></div>
                <div>
                  <h3 className="font-semibold text-secondary-900">Chat Support</h3>
                  <p className="text-secondary-600 text-sm">Available Mon-Fri, 9am-5pm EST.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-3 rounded-lg text-green-600"><Mail className="h-6 w-6" /></div>
                <div>
                  <h3 className="font-semibold text-secondary-900">Email Us</h3>
                  <p className="text-secondary-600 text-sm">support@xocial.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 p-3 rounded-lg text-purple-600"><Phone className="h-6 w-6" /></div>
                <div>
                  <h3 className="font-semibold text-secondary-900">Sales Inquiry</h3>
                  <p className="text-secondary-600 text-sm">+1 (888) 123-4567</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-12">
            <form onSubmit={submit} className="grid gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Message</label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="How can we help you?" className="min-h-[120px]" />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={status === 'submitting'}>{status === 'submitting' ? 'Sending...' : 'Send Message'}</Button>

              {status === 'success' && (
                <div className="bg-green-50 text-green-700 p-3 rounded-md text-center text-sm font-medium">
                  Message sent! We&apos;ll get back to you shortly.
                </div>
              )}
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
