'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import FaqSchema from '@/components/marketing/faq-schema'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import OptimizedImage from '@/components/ui/optimized-image'
import { CheckCircle2, ShieldCheck, Users, Clock, ArrowRight } from 'lucide-react'

export default function ApprovePage() {
  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-20 lg:pt-28 lg:pb-32 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-100 via-secondary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="mb-12 lg:mb-0 max-w-2xl">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-green-100 text-green-700 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Secure Workflows
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-secondary-900 sm:text-6xl mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                Approve with <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">confidence</span>
              </h1>
              <p className="text-lg leading-8 text-secondary-600 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                No more accidental posts. Set up custom approval chains to ensure every piece of content is brand-safe before it goes live.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <Link href="/auth/signup">
                  <Button size="lg" className="rounded-full shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-all font-semibold h-12 px-8">Start Free Trial</Button>
                </Link>
                <Link href="#demo">
                  <Button size="lg" variant="outline" className="rounded-full bg-white/50 backdrop-blur-sm hover:bg-white transition-all h-12 px-8">Watch Demo</Button>
                </Link>
              </div>
            </div>
            <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
              <div className="absolute -inset-4 bg-green-500/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
              <div className="rounded-2xl shadow-2xl border border-white/20 overflow-hidden bg-white/40 backdrop-blur-md ring-1 ring-black/5 transform rotate-2 hover:rotate-0 transition-transform duration-700">
                <OptimizedImage
                  src="/landing/feature-approve.png"
                  alt="Approval Workflow UI"
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
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600" />
            <CardContent className="p-8">
              <div className="mb-6 p-3 bg-green-50 w-fit rounded-xl group-hover:bg-green-100 transition-colors">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary-900 mb-3">Multi-Step Chains</h3>
              <p className="text-secondary-600 mb-6 leading-relaxed">Designate specific approvers for different stages (e.g. Copywriter &rarr; Legal &rarr; Client). Flexible power.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" /> Sequential logic</li>
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" /> Role-based assignment</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-white/50 hover:bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-cyan-600" />
            <CardContent className="p-8">
              <div className="mb-6 p-3 bg-teal-50 w-fit rounded-xl group-hover:bg-teal-100 transition-colors">
                <ArrowRight className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary-900 mb-3">External Approvals</h3>
              <p className="text-secondary-600 mb-6 leading-relaxed">Send a secure link to clients or stakeholders without them needing an account. Frictionless feedback.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-teal-600 flex-shrink-0" /> One-click access</li>
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-teal-600 flex-shrink-0" /> Mobile friendly</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-white/50 hover:bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-600" />
            <CardContent className="p-8">
              <div className="mb-6 p-3 bg-emerald-50 w-fit rounded-xl group-hover:bg-emerald-100 transition-colors">
                <Clock className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary-900 mb-3">Audit Trail</h3>
              <p className="text-secondary-600 mb-6 leading-relaxed">Full history of who approved what and when. Accountability built-in, so you&apos;re always covered.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" /> Timestamped logs</li>
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" /> Version control</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Video Section */}
        {/* Video Section */}
        <section id="demo" className="mb-32">
          <div className="bg-secondary-900 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-green-500 rounded-full blur-[100px] opacity-30"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-teal-500 rounded-full blur-[100px] opacity-30"></div>

            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-8 tracking-tight">See Approvals in Action</h2>
              <div className="max-w-4xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 backdrop-blur-sm relative group cursor-pointer">
                <iframe
                  className="w-full h-full absolute inset-0"
                  src="https://www.youtube.com/embed/oHg5SJYRHA0"
                  title="Approval Workflow"
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
              <AccordionTrigger>Do clients need to pay for a seat?</AccordionTrigger>
              <AccordionContent>No, external approvers are free and unlimited on Agency and Enterprise plans.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Can I approve from my phone?</AccordionTrigger>
              <AccordionContent>Yes, our approval interface is fully mobile-responsive for on-the-go sign-offs.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>What happens if a post is rejected?</AccordionTrigger>
              <AccordionContent>The creator is notified immediately with feedback, and the post status resets to &quot;Draft&quot; for edits.</AccordionContent>
            </AccordionItem>
          </Accordion>
          <FaqSchema items={[
            { question: 'Do clients need to pay for a seat?', answer: 'No, external approvers are free and unlimited on Agency and Enterprise plans.' },
            { question: 'Can I approve from my phone?', answer: 'Yes, our approval interface is fully mobile-responsive for on-the-go sign-offs.' },
            { question: 'What happens if a post is rejected?', answer: 'The creator is notified immediately with feedback, and the post status resets to "Draft" for edits.' }
          ]} />
        </section>

        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-secondary-900 mb-6">Ready to streamline approvals?</h2>
          <Link href="/auth/signup"><Button size="lg" className="px-8 rounded-full text-lg">Start Free Trial</Button></Link>
        </div>

      </div>
    </div>
  )
}
