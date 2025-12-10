'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import OptimizedImage from '@/components/ui/optimized-image'
import FaqSchema from '@/components/marketing/faq-schema'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  ShieldCheck,
  Palette,
  FileBox,
  CheckCircle2,
  ArrowRight,
  Play,
  Lock,
  Eye,
  Sparkles
} from 'lucide-react'
import MarketingLayout from '@/components/marketing/layout'

const features = [
  {
    icon: FileBox,
    title: 'Asset Control',
    description: 'A central media library ensures everyone uses approved imagery and logos only. No more pixelated uploads.',
    color: 'pink',
    points: ['Shared library', 'Expiring assets', 'Version control']
  },
  {
    icon: Palette,
    title: 'Tone Guardrails',
    description: 'AI assistance that learns your brand voice and flags posts that sound "off". Consistency at scale.',
    color: 'purple',
    points: ['Style guide enforcement', 'AI rewriting', 'Brand voice detection']
  },
  {
    icon: ShieldCheck,
    title: 'Stakeholder Visibility',
    description: 'Give executives a high-level view of the calendar without letting them break anything. Peace of mind included.',
    color: 'blue',
    points: ['Read-only views', 'Executive summaries', 'Role-based access']
  },
]

const brandBenefits = [
  { icon: Lock, label: 'Asset Protection', description: 'Lock core brand elements' },
  { icon: Sparkles, label: 'AI Voice Matching', description: 'Maintain consistent tone' },
  { icon: Eye, label: 'Approval Workflows', description: 'Multi-tier reviews' },
  { icon: ShieldCheck, label: 'Compliance Ready', description: 'Audit trails included' },
]

const colorClasses = {
  pink: { bg: 'bg-pink-100', text: 'text-pink-600', gradient: 'from-pink-400 to-rose-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', gradient: 'from-purple-400 to-violet-600' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', gradient: 'from-blue-400 to-indigo-600' },
}

export default function BrandsSolutionsPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative pt-12 sm:pt-16 lg:pt-24 pb-20 lg:pb-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-pink-200/40 via-pink-100/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-rose-200/30 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 xl:gap-24 items-center">
            <div className="mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 mb-6 font-semibold border border-pink-200/50">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm">For Brands</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary-900 mb-6 tracking-tight leading-tight">
                Protect your brand{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-600">
                  voice
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-secondary-600 mb-8 leading-relaxed max-w-lg">
                Eliminate the risk of rogue posts. Centralize your assets, standardize your workflows, and keep every stakeholder aligned.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto rounded-full px-8 h-14 text-lg shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-105 transition-all duration-300"
                  >
                    Start Brand Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto rounded-full px-8 h-14 text-lg group"
                  >
                    <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    Watch Demo
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-pink-200/60 via-rose-100/40 to-transparent rounded-full blur-3xl -z-10" />
              <div className="rounded-2xl sm:rounded-3xl shadow-2xl border border-secondary-200 overflow-hidden bg-white hover:scale-[1.02] transition-transform duration-500 rotate-1 hover:rotate-0">
                <OptimizedImage
                  src="/landing/solution-brand.png"
                  alt="Xocial Brand Management"
                  width={800}
                  height={600}
                  priority
                  className="w-full h-auto"
                />
              </div>

              {/* Floating Element */}
              <div className="absolute -bottom-4 -left-4 sm:bottom-8 sm:left-8 bg-white rounded-xl p-4 shadow-xl border border-secondary-200 animate-float hidden sm:flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-secondary-900">Brand compliant</div>
                  <div className="text-xs text-secondary-500">All assets verified</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Strip */}
      <section className="py-12 sm:py-16 bg-secondary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Enterprise-grade brand protection</h2>
            <p className="text-secondary-400">Everything you need to maintain brand consistency</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {brandBenefits.map((benefit, index) => (
              <div
                key={index}
                className="text-center p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">{benefit.label}</h3>
                <p className="text-secondary-400 text-xs sm:text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-secondary-900 mb-4 tracking-tight">
              Complete brand control
            </h2>
            <p className="text-lg text-secondary-600">
              Every tool you need to maintain brand integrity across all channels.
            </p>
          </div>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
            {features.map((feature, index) => {
              const colors = colorClasses[feature.color as keyof typeof colorClasses]
              return (
                <Card
                  key={index}
                  className="group relative overflow-hidden border-0 bg-white/80 hover:bg-white transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
                >
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${colors.gradient}`} />
                  <CardContent className="p-6 sm:p-8">
                    <div className={`h-14 w-14 rounded-2xl ${colors.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`h-7 w-7 ${colors.text}`} />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-secondary-900 mb-4">{feature.title}</h3>
                    <p className="text-secondary-600 mb-6 leading-relaxed">{feature.description}</p>
                    <ul className="space-y-3">
                      {feature.points.map((point, i) => (
                        <li key={i} className="flex items-center gap-3 text-secondary-700 font-medium">
                          <CheckCircle2 className={`h-5 w-5 ${colors.text} flex-shrink-0`} />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section id="demo" className="py-20 lg:py-32 bg-gradient-to-b from-secondary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-secondary-900 rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-16 text-center text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-pink-500 rounded-full blur-[100px] opacity-30" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-30" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-8 lg:mb-10 tracking-tight">
                See Brand Protection in Action
              </h2>
              <div className="max-w-5xl mx-auto aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black relative">
                <iframe
                  className="w-full h-full absolute inset-0"
                  src="https://www.youtube.com/embed/K4TOrB7at0Y"
                  title="Brand Workflow Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-secondary-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-secondary-600">Everything you need to know about brand management</p>
          </div>
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="q1" className="border border-secondary-200 rounded-xl px-6 data-[state=open]:bg-secondary-50">
              <AccordionTrigger className="text-base sm:text-lg font-medium text-secondary-900 py-5 hover:no-underline">
                Can I lock certain assets?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 text-base leading-relaxed pb-5">
                Yes! Admins can lock fundamental brand assets so they cannot be modified or deleted by team members.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2" className="border border-secondary-200 rounded-xl px-6 data-[state=open]:bg-secondary-50">
              <AccordionTrigger className="text-base sm:text-lg font-medium text-secondary-900 py-5 hover:no-underline">
                How does the AI know my brand voice?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 text-base leading-relaxed pb-5">
                You upload samples of your best copy, and our AI analyzes the tone, sentence structure, and vocabulary to mimic it accurately.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3" className="border border-secondary-200 rounded-xl px-6 data-[state=open]:bg-secondary-50">
              <AccordionTrigger className="text-base sm:text-lg font-medium text-secondary-900 py-5 hover:no-underline">
                Do you support SSO?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 text-base leading-relaxed pb-5">
                Yes, Single Sign-On (SAML/Okta) is available on our Enterprise plan for secure access management.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4" className="border border-secondary-200 rounded-xl px-6 data-[state=open]:bg-secondary-50">
              <AccordionTrigger className="text-base sm:text-lg font-medium text-secondary-900 py-5 hover:no-underline">
                Can I set asset expiration dates?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 text-base leading-relaxed pb-5">
                Yes! You can set expiration dates for campaign-specific assets to ensure outdated materials are automatically archived.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <FaqSchema items={[
            { question: 'Can I lock certain assets?', answer: 'Yes, admins can lock fundamental brand assets so they cannot be modified or deleted.' },
            { question: 'How does the AI know my brand voice?', answer: 'You upload samples of your best copy and our AI analyzes the tone.' },
            { question: 'Do you support SSO?', answer: 'Yes, Single Sign-On is available on our Enterprise plan.' },
            { question: 'Can I set asset expiration dates?', answer: 'Yes! You can set expiration dates for campaign-specific assets.' }
          ]} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-pink-100 via-rose-100 to-pink-100 rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-200/50 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-200/50 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
                Ready to secure your brand?
              </h2>
              <p className="text-lg sm:text-xl text-secondary-600 mb-8 max-w-xl mx-auto">
                Join leading brands who trust Xocial to protect their voice and assets.
              </p>
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="px-8 sm:px-10 h-14 rounded-full text-lg shadow-xl hover:scale-105 transition-transform"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
