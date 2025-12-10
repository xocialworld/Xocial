'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import OptimizedImage from '@/components/ui/optimized-image'
import FaqSchema from '@/components/marketing/faq-schema'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { MapPin, Globe, Copy, CheckCircle2 } from 'lucide-react'

export default function MultiLocationSolutionsPage() {
  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-20 lg:pt-28 lg:pb-32 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-100 via-secondary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="mb-12 lg:mb-0 max-w-2xl">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-teal-100 text-teal-700 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <MapPin className="mr-2 h-4 w-4" />
                For Multi-Location
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-secondary-900 sm:text-6xl mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                Global brand, <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">local impact</span>
              </h1>
              <p className="text-lg leading-8 text-secondary-600 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                Manage 100s of location pages with ease. Push corporate content to all, whilst letting local managers add their flair. Distributed control.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <Link href="/auth/signup">
                  <Button size="lg" className="rounded-full shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all font-semibold h-12 px-8">Start Multi-Loc Trial</Button>
                </Link>
                <Link href="#demo">
                  <Button size="lg" variant="outline" className="rounded-full bg-white/50 backdrop-blur-sm hover:bg-white transition-all h-12 px-8">Watch Demo</Button>
                </Link>
              </div>
            </div>
            <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
              <div className="absolute -inset-4 bg-teal-500/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
              <div className="rounded-2xl shadow-2xl border border-white/20 overflow-hidden bg-white/40 backdrop-blur-md ring-1 ring-black/5 transform rotate-2 hover:rotate-0 transition-transform duration-700">
                <OptimizedImage
                  src="/landing/solution-multi.png"
                  alt="Multi-Location Publishing Interface"
                  width={800}
                  height={600}
                  priority
                  className="rounded-lg shadow-inner"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Features Grid */}
        {/* Features Grid */}
        <section className="grid gap-8 md:grid-cols-3 mb-32">
          <Card className="group relative overflow-hidden border-0 bg-white/50 hover:bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-emerald-600" />
            <CardContent className="p-8">
              <div className="mb-6 p-3 bg-teal-50 w-fit rounded-xl group-hover:bg-teal-100 transition-colors">
                <Globe className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary-900 mb-3">Cascade Publishing</h3>
              <p className="text-secondary-600 mb-6 leading-relaxed">Create one master post and replicate it to 500+ location pages instantly. Efficiency defined.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-teal-600 flex-shrink-0" /> Batch scheduling</li>
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-teal-600 flex-shrink-0" /> Local variables</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-white/50 hover:bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-lime-600" />
            <CardContent className="p-8">
              <div className="mb-6 p-3 bg-green-50 w-fit rounded-xl group-hover:bg-green-100 transition-colors">
                <Copy className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary-900 mb-3">Local Customization</h3>
              <p className="text-secondary-600 mb-6 leading-relaxed">Allow local managers to edit the caption or image of a corporate post before it goes live. Local context matters.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" /> Permission tiers</li>
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" /> Approval gates</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-white/50 hover:bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-600" />
            <CardContent className="p-8">
              <div className="mb-6 p-3 bg-blue-50 w-fit rounded-xl group-hover:bg-blue-100 transition-colors">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary-900 mb-3">Drill-Down Analytics</h3>
              <p className="text-secondary-600 mb-6 leading-relaxed">See which regions are performing best. Compare New York vs London side-by-side. Data-driven growth.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" /> Regional leaderboards</li>
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" /> Aggregate totals</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Video Section */}
        {/* Video Section */}
        <section id="demo" className="mb-32">
          <div className="bg-secondary-900 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-teal-500 rounded-full blur-[100px] opacity-30"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-30"></div>

            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-8 tracking-tight">See Multi-Location in Action</h2>
              <div className="max-w-4xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 backdrop-blur-sm relative group cursor-pointer">
                <iframe
                  className="w-full h-full absolute inset-0"
                  src="https://www.youtube.com/embed/K4TOrB7at0Y"
                  title="Multi-Location Workflow"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-secondary-900 mb-6 text-center">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger>How many locations can we manage?</AccordionTrigger>
              <AccordionContent>There is no limit. Xocial is architected to handle thousands of connected accounts.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Can I dynamic insert city names?</AccordionTrigger>
              <AccordionContent>Yes, use variables like {"{city_name}"} in your captions and we will replace it for each location.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Do you support Google Business Profile?</AccordionTrigger>
              <AccordionContent>Yes, scheduling updates to hundreds of GBP listings is a core feature.</AccordionContent>
            </AccordionItem>
          </Accordion>
          <FaqSchema items={[
            { question: 'How many locations can we manage?', answer: 'There is no limit. Xocial is architected to handle thousands of connected accounts.' },
            { question: 'Can I dynamic insert city names?', answer: 'Yes, use variables like `{city_name}` in your captions and we will replace it for each location.' },
            { question: 'Do you support Google Business Profile?', answer: 'Yes, scheduling updates to hundreds of GBP listings is a core feature.' }
          ]} />
        </section>

        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-secondary-900 mb-6">Ready to go global?</h2>
          <Link href="/auth/signup"><Button size="lg" className="px-8 rounded-full text-lg">Start Free Trial</Button></Link>
        </div>

      </div>
    </div>
  )
}
