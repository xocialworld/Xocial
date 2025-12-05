'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import FaqSchema from '@/components/marketing/faq-schema'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = { title: 'Analyze – Xocial', description: 'Dashboards and AI insights' }

export default function AnalyzePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-secondary-900 mb-8">Analyze</h1>
      <section className="grid gap-8 md:grid-cols-3">
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">How it works</h3><p className="text-secondary-700">Pre-aggregated metrics power fast dashboards and AI summaries.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Hourly snapshots</li><li>Materialized daily views</li><li>AI insights stored</li></ul></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">Key features</h3><p className="text-secondary-700">Overview KPIs, per-platform filters, top posts, exports.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>KPI cards</li><li>Platform breakdowns</li><li>Top posts ranking</li></ul></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold text-secondary-900 mb-2">Comparison</h3><p className="text-secondary-700">Better visibility and action vs raw spreadsheets.</p><ul className="mt-3 list-disc pl-4 text-secondary-700"><li>Decisions vs data dumps</li><li>Export-ready visuals</li><li>Actionable summaries</li></ul></CardContent></Card>
      </section>
      <section className="mt-12">
        <div className="aspect-video w-full rounded-lg overflow-hidden">
          <iframe
            className="w-full h-full"
            src="https://www.youtube-nocookie.com/embed/lTTajzrSkCw"
            title="Analyze in Xocial – Demo"
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
          <AccordionItem value="q1"><AccordionTrigger>Do you support exports?</AccordionTrigger><AccordionContent>Yes, export dashboards and top posts as CSV or images.</AccordionContent></AccordionItem>
          <AccordionItem value="q2"><AccordionTrigger>How are AI insights generated?</AccordionTrigger><AccordionContent>Daily jobs summarize metrics via the AI Gateway.</AccordionContent></AccordionItem>
        </Accordion>
        <FaqSchema items={[
          { question: 'Do you support exports?', answer: 'Yes, export dashboards and top posts as CSV or images.' },
          { question: 'How are AI insights generated?', answer: 'Daily jobs summarize metrics via the AI Gateway.' },
        ]} />
      </section>
      <div className="mt-12 flex gap-4">
        <Link href="/auth/signup"><Button>Start free</Button></Link>
        <Link href="/support"><Button variant="secondary">Book demo</Button></Link>
      </div>
    </div>
  )
}
