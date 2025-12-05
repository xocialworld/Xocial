'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import FaqSchema from '@/components/marketing/faq-schema'


const plans = {
  monthly: { free: 0, pro: 39, growth: 99 },
  yearly: { free: 0, pro: 390, growth: 990 },
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false)
  const [workspaces, setWorkspaces] = useState(1)
  const [seats, setSeats] = useState(3)

  const price = yearly ? plans.yearly : plans.monthly
  const extraSeats = Math.max(0, seats - (yearly ? 10 : 3))
  const seatCost = extraSeats * 10 * (yearly ? 12 : 1)
  const baseWorkspaceCost = (yearly ? 0 : 0) // free plan omitted in calculator
  const proWorkspaceCost = (yearly ? 390 : 39) * Math.max(0, workspaces - 0)

  const estimate = seatCost + proWorkspaceCost

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-secondary-900">Pricing</h1>
        <div className="flex items-center gap-3" aria-label="Billing period toggle">
          <span className="text-sm text-secondary-700">Monthly</span>
          <Switch checked={yearly} onCheckedChange={setYearly} aria-label="Toggle yearly pricing" />
          <span className="text-sm text-secondary-700">Yearly</span>
        </div>
      </div>
      <section className="grid gap-6 md:grid-cols-4">
        <Card><CardContent className="p-6"><h3 className="text-xl font-semibold mb-2">Free</h3><p className="text-secondary-700">${price.free} / mo</p></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="text-xl font-semibold mb-2">Pro</h3><p className="text-secondary-700">${price.pro} / workspace{yearly ? ' / yr' : ' / mo'}</p></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="text-xl font-semibold mb-2">Growth</h3><p className="text-secondary-700">${price.growth} / workspace{yearly ? ' / yr' : ' / mo'}</p></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="text-xl font-semibold mb-2">Enterprise</h3><p className="text-secondary-700">Custom</p></CardContent></Card>
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Estimate your cost</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm text-secondary-700 mb-1">Workspaces</label>
            <Input type="number" min={1} value={workspaces} onChange={(e) => setWorkspaces(Number(e.target.value))} aria-label="Workspaces" />
          </div>
          <div>
            <label className="block text-sm text-secondary-700 mb-1">Seats</label>
            <Input type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} aria-label="Seats" />
          </div>
          <div className="flex items-end">
            <Card className="w-full"><CardContent className="p-6"><p className="text-sm text-secondary-700">Estimated</p><p className="text-2xl font-bold">${estimate}</p></CardContent></Card>
          </div>
        </div>
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-secondary-900 mb-4">FAQ</h2>
        <div className="grid gap-2">
          <p className="text-secondary-700">How are seats billed? Extra seats are billed at $10/seat/month on Pro & Growth.</p>
          <p className="text-secondary-700">Do downgrades take effect immediately? Downgrades apply at the end of the billing period.</p>
        </div>
        <FaqSchema items={[
          { question: 'How are seats billed?', answer: 'Extra seats are billed at $10/seat/month on Pro & Growth.' },
          { question: 'Do downgrades take effect immediately?', answer: 'Downgrades apply at the end of the billing period.' },
        ]} />
      </section>
      <div className="mt-12 flex gap-4"><Button>Start free</Button><Button variant="secondary">Contact sales</Button></div>
    </div>
  )
}
