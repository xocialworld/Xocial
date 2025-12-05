'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'


export default function MultiLocationSolutionsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-secondary-900 mb-8">Multi-location</h1>
      <section className="grid gap-8 md:grid-cols-2">
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">The pain</h3><p className="text-secondary-700">Local pages drifting off-brand and complex multi-step approvals.</p></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">The solution</h3><p className="text-secondary-700">Approval workflows, permissions, and analytics visibility across locations.</p></CardContent></Card>
      </section>
      <div className="mt-12 flex gap-4"><Link href="/auth/signup"><Button>Start free</Button></Link><Link href="/support"><Button variant="secondary">Book demo</Button></Link></div>
    </div>
  )
}

