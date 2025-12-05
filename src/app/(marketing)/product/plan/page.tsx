'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import FaqSchema from '@/components/marketing/faq-schema'
import { Button } from '@/components/ui/button'
import Link from 'next/link'


export default function PlanPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-secondary-900 mb-8">Plan</h1>
      <section className="grid gap-8 md:grid-cols-3">
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">How it works</h3><p className="text-secondary-700">Month/Week/Day views with platform and status filters.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Filter by platform and status</li><li>See per-day summaries</li><li>Drill into day details</li></ul></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">Key features</h3><p className="text-secondary-700">Drag-and-drop rescheduling, day panels, denormalized summaries.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Bulk actions</li><li>Platform views (grid/list/feed)</li><li>Fast queries and caching</li></ul></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">Comparison</h3><p className="text-secondary-700">Calendars beat spreadsheets with visibility and guardrails.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Single timeline</li><li>RLS-backed collaboration</li><li>Approval-aware scheduling</li></ul></CardContent></Card>
      </section>
      <section className="mt-12">
        <div className="aspect-video w-full rounded-lg overflow-hidden">
          <iframe
            className="w-full h-full"
            src="https://www.youtube-nocookie.com/embed/tgbNymZ7vqY"
            title="Plan in Xocial – Demo"
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
          <AccordionItem value="q1"><AccordionTrigger>Can I filter by platform?</AccordionTrigger><AccordionContent>Yes, filter by platform and status with fast queries.</AccordionContent></AccordionItem>
          <AccordionItem value="q2"><AccordionTrigger>Do you support drag-and-drop?</AccordionTrigger><AccordionContent>Yes, reschedule with drag-and-drop and confirmation dialogs.</AccordionContent></AccordionItem>
        </Accordion>
        <FaqSchema items={[
          { question: 'Can I filter by platform?', answer: 'Yes, filter by platform and status with fast queries.' },
          { question: 'Do you support drag-and-drop?', answer: 'Yes, reschedule with drag-and-drop and confirmation dialogs.' },
        ]} />
      </section>
      <div className="mt-12 flex gap-4">
        <Link href="/auth/signup"><Button>Start free</Button></Link>
        <Link href="/support"><Button variant="secondary">Book demo</Button></Link>
      </div>
    </div>
  )
}
