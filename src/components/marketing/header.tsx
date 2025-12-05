'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { trackEngagement } from '@/lib/performance-monitoring'

export default function MarketingHeader() {
  return (
    <header role="banner" aria-label="Site header" className="border-b border-secondary-200 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary-600" aria-hidden />
            <Link href="/" className="text-2xl font-bold text-secondary-900" aria-label="Xocial home">Xocial</Link>
          </div>
          <nav aria-label="Primary" className="flex items-center gap-6">
            <Link href="/product/create" className="text-secondary-700 hover:text-secondary-900">Create</Link>
            <Link href="/product/plan" className="text-secondary-700 hover:text-secondary-900">Plan</Link>
            <Link href="/product/approve" className="text-secondary-700 hover:text-secondary-900">Approve</Link>
            <Link href="/product/collaborate" className="text-secondary-700 hover:text-secondary-900">Collaborate</Link>
            <Link href="/product/schedule" className="text-secondary-700 hover:text-secondary-900">Schedule</Link>
            <Link href="/product/analyze" className="text-secondary-700 hover:text-secondary-900">Analyze</Link>
            <Link href="/solutions/brands" className="text-secondary-700 hover:text-secondary-900">Brands</Link>
            <Link href="/solutions/agencies" className="text-secondary-700 hover:text-secondary-900">Agencies</Link>
            <Link href="/solutions/multi-location" className="text-secondary-700 hover:text-secondary-900">Multi-location</Link>
            <Link href="/pricing" className="text-secondary-700 hover:text-secondary-900">Pricing</Link>
            <Link href="/blog" className="text-secondary-700 hover:text-secondary-900">Blog</Link>
            <Link href="/resources" className="text-secondary-700 hover:text-secondary-900">Resources</Link>
            <Link href="/customers" className="text-secondary-700 hover:text-secondary-900">Customers</Link>
            <Link href="/support" className="text-secondary-700 hover:text-secondary-900">Support</Link>
          </nav>
          <div className="flex gap-4">
            <Link href="/auth/login" onClick={() => trackEngagement({ event: 'nav_click', label: 'header_signin' })}>
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/signup" onClick={() => trackEngagement({ event: 'nav_click', label: 'header_get_started' })}>
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
