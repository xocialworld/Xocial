'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import FaqSchema from '@/components/marketing/faq-schema'
import { Button } from '@/components/ui/button'
import Link from 'next/link'


export default function CollaboratePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-secondary-900 mb-8">Collaborate</h1>
      <section className="grid gap-8 md:grid-cols-3">
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">How it works</h3><p className="text-secondary-700">Discuss on content items with internal/external visibility controls.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Inline comment threads</li><li>@mentions for quick attention</li><li>Visibility: internal vs external</li></ul></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">Key features</h3><p className="text-secondary-700">Mentions, moderation, delete within window, admin control.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Moderation tools</li><li>Undo-send window</li><li>Admin overrides</li></ul></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">Comparison</h3><p className="text-secondary-700">Centralize feedback vs scattered chats/emails.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>One place for decisions</li><li>Faster iteration</li><li>Reduced confusion</li></ul></CardContent></Card>
      </section>
      <section className="mt-12">
        <div className="aspect-video w-full rounded-lg overflow-hidden">
          <iframe
            className="w-full h-full"
            src="https://www.youtube-nocookie.com/embed/IcrbM1l_BoI"
            title="Collaborate in Xocial – Demo"
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
          <AccordionItem value="q1"><AccordionTrigger>Can external guests participate?</AccordionTrigger><AccordionContent>Yes, external threads are visible to guests with limited access.</AccordionContent></AccordionItem>
          <AccordionItem value="q2"><AccordionTrigger>Are mentions notified?</AccordionTrigger><AccordionContent>Yes, tagged users receive notifications.</AccordionContent></AccordionItem>
        </Accordion>
        <FaqSchema items={[
          { question: 'Can external guests participate?', answer: 'Yes, external threads are visible to guests with limited access.' },
          { question: 'Are mentions notified?', answer: 'Yes, tagged users receive notifications.' },
        ]} />
      </section>
      <div className="mt-12 flex gap-4">
        <Link href="/auth/signup"><Button>Start free</Button></Link>
        <Link href="/support"><Button variant="secondary">Book demo</Button></Link>
      </div>
    </div>
  )
}
