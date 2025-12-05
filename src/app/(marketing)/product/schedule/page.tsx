'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import FaqSchema from '@/components/marketing/faq-schema'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = { title: 'Schedule – Xocial', description: 'Reliable scheduling and auto-publishing' }

export default function SchedulePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-secondary-900 mb-8">Schedule</h1>
      <section className="grid gap-8 md:grid-cols-3">
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">How it works</h3><p className="text-secondary-700">Background job runner publishes scheduled variants with retries.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Queue-driven publishing</li><li>Platform adapters</li><li>Retry/backoff on rate limits</li></ul></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">Key features</h3><p className="text-secondary-700">Rate-limit handling, error logging, restore scheduled posts.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Failure tracking</li><li>Restore scheduled posts</li><li>Publish status visibility</li></ul></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">Comparison</h3><p className="text-secondary-700">Replace manual publishing with dependable automation.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Reduce manual errors</li><li>Predictable timelines</li><li>Auditable runs</li></ul></CardContent></Card>
      </section>
      <section className="mt-12">
        <div className="aspect-video w-full rounded-lg overflow-hidden">
          <iframe
            className="w-full h-full"
            src="https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ"
            title="Schedule in Xocial – Demo"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-secondary-900 mb-4">FAQ</h2>
        <Accordion type="single" collapsible>
          <AccordionItem value="q1"><AccordionTrigger>What happens on failures?</AccordionTrigger><AccordionContent>Variants are marked failed and can be retried; errors logged.</AccordionContent></AccordionItem>
          <AccordionItem value="q2"><AccordionTrigger>Do you support multiple platforms?</AccordionTrigger><AccordionContent>Yes, per-platform adapters publish variants.</AccordionContent></AccordionItem>
        </Accordion>
        <FaqSchema items={[
          { question: 'What happens on failures?', answer: 'Variants are marked failed and can be retried; errors logged.' },
          { question: 'Do you support multiple platforms?', answer: 'Yes, per-platform adapters publish variants.' },
        ]} />
      </section>
      <div className="mt-12 flex gap-4">
        <Link href="/auth/signup"><Button>Start free</Button></Link>
        <Link href="/support"><Button variant="secondary">Book demo</Button></Link>
      </div>
    </div>
  )
}
