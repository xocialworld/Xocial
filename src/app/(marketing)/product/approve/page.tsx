'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import FaqSchema from '@/components/marketing/faq-schema'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = { title: 'Approve – Xocial', description: 'Robust approval workflows' }

export default function ApprovePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-secondary-900 mb-8">Approve</h1>
      <section className="grid gap-8 md:grid-cols-3">
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">How it works</h3><p className="text-secondary-700">Single-step, sequential, or parallel approvals with audit trail.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Request approval from composer</li><li>Track actions per step</li><li>Auto-advance on required approvals</li></ul></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">Key features</h3><p className="text-secondary-700">Role-based approvals, comments, resubmit flows.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Role or user-specific steps</li><li>Internal/external comments</li><li>Reject → edit → resubmit loop</li></ul></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">Comparison</h3><p className="text-secondary-700">Replace email chaos with structured workflows.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Single timeline of decisions</li><li>Audit-ready visibility</li><li>Client-friendly approvals</li></ul></CardContent></Card>
      </section>
      <section className="mt-12">
        <div className="aspect-video w-full rounded-lg overflow-hidden">
          <iframe
            className="w-full h-full"
            src="https://www.youtube-nocookie.com/embed/oHg5SJYRHA0"
            title="Approve in Xocial – Demo"
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
          <AccordionItem value="q1"><AccordionTrigger>Can clients approve without full access?</AccordionTrigger><AccordionContent>Yes, invite external approvers with restricted visibility.</AccordionContent></AccordionItem>
          <AccordionItem value="q2"><AccordionTrigger>Do you track who approved?</AccordionTrigger><AccordionContent>Yes, actions and actors are recorded per step.</AccordionContent></AccordionItem>
        </Accordion>
        <FaqSchema items={[
          { question: 'Can clients approve without full access?', answer: 'Yes, invite external approvers with restricted visibility.' },
          { question: 'Do you track who approved?', answer: 'Yes, actions and actors are recorded per step.' },
        ]} />
      </section>
      <div className="mt-12 flex gap-4">
        <Link href="/auth/signup"><Button>Start free</Button></Link>
        <Link href="/support"><Button variant="secondary">Book demo</Button></Link>
      </div>
    </div>
  )
}
