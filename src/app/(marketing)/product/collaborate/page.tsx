'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import FaqSchema from '@/components/marketing/faq-schema'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import OptimizedImage from '@/components/ui/optimized-image'
import { MessageSquare, Users, Lock, CheckCircle2 } from 'lucide-react'

export default function CollaboratePage() {
  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-20 lg:pt-28 lg:pb-32 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100 via-secondary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="mb-12 lg:mb-0 max-w-2xl">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-purple-100 text-purple-700 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Users className="mr-2 h-4 w-4" />
                Team & Client Collaboration
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-secondary-900 sm:text-6xl mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                Feedback without the <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">friction</span>
              </h1>
              <p className="text-lg leading-8 text-secondary-600 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                Context is everything. Discuss edits, tag teammates, and get approvals right next to the content itself. No more email threads.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <Link href="/auth/signup">
                  <Button size="lg" className="rounded-full shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all font-semibold h-12 px-8">Start Collaborating Free</Button>
                </Link>
                <Link href="#demo">
                  <Button size="lg" variant="outline" className="rounded-full bg-white/50 backdrop-blur-sm hover:bg-white transition-all h-12 px-8">Watch Demo</Button>
                </Link>
              </div>
            </div>
            <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
              <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
              <div className="rounded-2xl shadow-2xl border border-white/20 overflow-hidden bg-white/40 backdrop-blur-md ring-1 ring-black/5 transform rotate-2 hover:rotate-0 transition-transform duration-700">
                <OptimizedImage
                  src="/landing/feature-collaborate.png"
                  alt="Collaboration Interface"
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
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-violet-600" />
            <CardContent className="p-8">
              <div className="mb-6 p-3 bg-purple-50 w-fit rounded-xl group-hover:bg-purple-100 transition-colors">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary-900 mb-3">Contextual Comments</h3>
              <p className="text-secondary-600 mb-6 leading-relaxed">No more &quot;see email regarding the third post on Tuesday&quot;. Comment directly on the post preview.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0" /> Threaded conversations</li>
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0" /> Resolve to archive</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-white/50 hover:bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-amber-600" />
            <CardContent className="p-8">
              <div className="mb-6 p-3 bg-yellow-50 w-fit rounded-xl group-hover:bg-yellow-100 transition-colors">
                <Lock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary-900 mb-3">Internal Notes</h3>
              <p className="text-secondary-600 mb-6 leading-relaxed">Keep team chatter private. Toggle comments as &quot;Internal&quot; so clients only see what they need to.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-yellow-600 flex-shrink-0" /> Private team layer</li>
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-yellow-600 flex-shrink-0" /> Client-safe views</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-white/50 hover:bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-600" />
            <CardContent className="p-8">
              <div className="mb-6 p-3 bg-blue-50 w-fit rounded-xl group-hover:bg-blue-100 transition-colors">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary-900 mb-3">Real-Time Mentions</h3>
              <p className="text-secondary-600 mb-6 leading-relaxed">Tag @design for a new image or @copy for a headline tweak. Notifications keep everyone in sync.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" /> Instant alerts</li>
                <li className="flex items-center gap-3 text-sm font-medium text-secondary-700"><CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" /> Deep linking</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Video Section */}
        {/* Video Section */}
        <section id="demo" className="mb-32">
          <div className="bg-secondary-900 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-30"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-30"></div>

            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-8 tracking-tight">See Collaboration in Action</h2>
              <div className="max-w-4xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 backdrop-blur-sm relative group cursor-pointer">
                <iframe
                  className="w-full h-full absolute inset-0"
                  src="https://www.youtube.com/embed/IcrbM1l_BoI"
                  title="Collaboration Workflow"
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
              <AccordionTrigger>Who can see internal notes?</AccordionTrigger>
              <AccordionContent>Only team members with specific roles (Admin, Manager, Creator) can see internal notes. External guests cannot.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Can I collaborate via email?</AccordionTrigger>
              <AccordionContent>Yes, reply to notification emails to have your comment posted directly to the thread.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Is there a history of edits?</AccordionTrigger>
              <AccordionContent>Yes, Xocial maintains a version history of every post so you can reference past iterations.</AccordionContent>
            </AccordionItem>
          </Accordion>
          <FaqSchema items={[
            { question: 'Who can see internal notes?', answer: 'Only team members with specific roles (Admin, Manager, Creator) can see internal notes. External guests cannot.' },
            { question: 'Can I collaborate via email?', answer: 'Yes, reply to notification emails to have your comment posted directly to the thread.' },
            { question: 'Is there a history of edits?', answer: 'Yes, Xocial maintains a version history of every post so you can reference past iterations.' }
          ]} />
        </section>

        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-secondary-900 mb-6">Ready to work together?</h2>
          <Link href="/auth/signup"><Button size="lg" className="px-8 rounded-full text-lg">Start Free Trial</Button></Link>
        </div>

      </div>
    </div>
  )
}
