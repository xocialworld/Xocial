'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import FaqSchema from '@/components/marketing/faq-schema'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = { title: 'Create – Xocial', description: 'AI-first content creation across platforms' }

export default function CreatePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-secondary-900 mb-8">Create</h1>
      <section className="grid gap-8 md:grid-cols-3">
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">How it works</h3><p className="text-secondary-700">Draft once, adapt per platform, attach media, and preview fidelity.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Unified composer for captions + media</li><li>Per-platform constraints with live counters</li><li>High-fidelity previews</li></ul></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">Key features</h3><p className="text-secondary-700">AI captioning, hashtags, per-platform variants, character counters.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>AI tones and rewriting</li><li>Hashtag suggestions</li><li>Mentions and link handling</li></ul></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">Why better than spreadsheets</h3><p className="text-secondary-700">Structured workflow with approvals, previews, and scheduling built-in.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Single source of truth</li><li>Clear ownership and approvals</li><li>Fast scheduling</li></ul></CardContent></Card>
      </section>
      <section className="mt-12">
        <div className="aspect-video w-full rounded-lg overflow-hidden">
          <iframe
            className="w-full h-full"
            src="https://www.youtube-nocookie.com/embed/DFyrQFiuuyo"
            title="Create in Xocial – Demo"
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
          <AccordionItem value="q1"><AccordionTrigger>Can I create variants for multiple platforms?</AccordionTrigger><AccordionContent>Yes, create variants and preview per platform before scheduling.</AccordionContent></AccordionItem>
          <AccordionItem value="q2"><AccordionTrigger>Does AI support different tones?</AccordionTrigger><AccordionContent>Yes, choose tone and platform constraints are respected.</AccordionContent></AccordionItem>
        </Accordion>
        <FaqSchema items={[
          { question: 'Can I create variants for multiple platforms?', answer: 'Yes, create variants and preview per platform before scheduling.' },
          { question: 'Does AI support different tones?', answer: 'Yes, choose tone and platform constraints are respected.' },
        ]} />
      </section>
      <div className="mt-12 flex gap-4">
        <Link href="/auth/signup"><Button>Start free</Button></Link>
        <Link href="/support"><Button variant="secondary">Book demo</Button></Link>
      </div>
    </div>
  )
}
