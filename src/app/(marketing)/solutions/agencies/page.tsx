'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import OptimizedImage from '@/components/ui/optimized-image'
import FaqSchema from '@/components/marketing/faq-schema'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Briefcase,
  Building2,
  Globe,
  Users,
  CheckCircle2,
  Play,
  ArrowRight,
  FileText,
  MessageSquare,
  BarChart3,
  Shield,
  Clock,
  Zap
} from 'lucide-react'
import MarketingLayout from '@/components/marketing/layout'

const features = [
  {
    icon: Briefcase,
    title: 'Client Workspaces',
    description: 'Give each client their own branded portal. Keep data strictly isolated and secure with granular permissions.',
    color: 'indigo',
    points: ['Custom branding per client', 'Granular permissions', 'Data isolation']
  },
  {
    icon: MessageSquare,
    title: 'Approval Loops',
    description: 'Stop chasing emails. Clients approve content with one click, no login required.',
    color: 'purple',
    points: ['One-click feedback', 'Email notifications', 'Full audit history']
  },
  {
    icon: FileText,
    title: 'Unified Reporting',
    description: 'Generate beautiful PDF reports for all your clients in seconds, automatically.',
    color: 'blue',
    points: ['White-label options', 'Scheduled delivery', 'Custom metrics']
  },
]

const benefits = [
  { icon: Clock, label: 'Save 10+ hours/week', description: 'per account manager' },
  { icon: Users, label: 'Handle 3x more clients', description: 'with the same team' },
  { icon: Zap, label: '50% faster approvals', description: 'average turnaround' },
  { icon: Shield, label: 'Enterprise security', description: 'SOC2 compliant' },
]

const colorClasses = {
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
}

export default function AgenciesSolutionsPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative pt-12 sm:pt-16 lg:pt-24 pb-20 lg:pb-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-indigo-200/40 via-indigo-100/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-blue-200/30 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 xl:gap-24 items-center">
            <div className="mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 mb-6 font-semibold border border-indigo-200/50">
                <Briefcase className="h-4 w-4" />
                <span className="text-sm">For Agencies</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary-900 mb-6 tracking-tight leading-tight">
                Scale your agency{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
                  without the chaos
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-secondary-600 mb-8 leading-relaxed max-w-lg">
                Manage 50+ clients from one dashboard. Custom approvals, branded workspaces, and automated reporting that makes you look like a pro.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto rounded-full px-8 h-14 text-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300"
                  >
                    Start Agency Trial
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
              <div className="absolute -inset-4 bg-gradient-to-br from-indigo-200/60 via-blue-100/40 to-transparent rounded-full blur-3xl -z-10" />
              <div className="rounded-2xl sm:rounded-3xl shadow-2xl border border-secondary-200 overflow-hidden bg-white hover:scale-[1.02] transition-transform duration-500">
                <OptimizedImage
                  src="/landing/solution-agency.png"
                  alt="Xocial Agency Dashboard - Multi-client management"
                  width={800}
                  height={600}
                  priority
                  className="w-full h-auto"
                />
              </div>

              {/* Floating Stats */}
              <div className="absolute -bottom-4 -left-4 sm:bottom-8 sm:left-8 bg-white rounded-xl p-4 shadow-xl border border-secondary-200 animate-float hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-secondary-900">12 Clients Active</div>
                    <div className="text-xs text-secondary-500">All content on schedule</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Strip */}
      <section className="py-12 sm:py-16 bg-secondary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {benefits.map((item, index) => (
              <div key={index} className="text-center">
                <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-6 w-6 text-indigo-400" />
                </div>
                <h3 className="font-bold text-white mb-1 text-sm sm:text-base">{item.label}</h3>
                <p className="text-secondary-400 text-xs sm:text-sm">{item.description}</p>
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
              Built for agency workflows
            </h2>
            <p className="text-lg text-secondary-600">
              Every feature designed to help you manage more clients with less effort.
            </p>
          </div>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
            {features.map((feature, index) => {
              const colors = colorClasses[feature.color as keyof typeof colorClasses]
              return (
                <Card
                  key={index}
                  className={`border-t-4 ${colors.border} shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2`}
                >
                  <CardContent className="p-6 sm:p-8">
                    <div className={`h-14 w-14 rounded-2xl ${colors.bg} flex items-center justify-center mb-6`}>
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
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 to-transparent" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-8 lg:mb-10 tracking-tight">
                See Agency Workflows in Action
              </h2>
              <div className="max-w-5xl mx-auto aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-secondary-700 bg-black relative">
                <iframe
                  className="w-full h-full absolute inset-0"
                  src="https://www.youtube.com/embed/K4TOrB7at0Y"
                  title="Agency Workflow Demo"
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
            <p className="text-secondary-600">Common questions about Xocial for agencies</p>
          </div>
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="q1" className="border border-secondary-200 rounded-xl px-6 data-[state=open]:bg-secondary-50">
              <AccordionTrigger className="text-base sm:text-lg font-medium text-secondary-900 py-5 hover:no-underline">
                How is pricing handled for agencies?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 text-base leading-relaxed pb-5">
                Our Agency plan includes 5 workspaces and 10 users. Extra workspaces are $39/month and extra users are $10/month. External client reviewers are always free.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2" className="border border-secondary-200 rounded-xl px-6 data-[state=open]:bg-secondary-50">
              <AccordionTrigger className="text-base sm:text-lg font-medium text-secondary-900 py-5 hover:no-underline">
                Can I white-label the platform?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 text-base leading-relaxed pb-5">
                Yes! On our Enterprise plan, you can use your own domain, logo, and colors for the client portal. Contact us for custom branding options.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3" className="border border-secondary-200 rounded-xl px-6 data-[state=open]:bg-secondary-50">
              <AccordionTrigger className="text-base sm:text-lg font-medium text-secondary-900 py-5 hover:no-underline">
                Is there a limit on social accounts?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 text-base leading-relaxed pb-5">
                Agency plans include 30 social profiles with no upper limit. Enterprise plans scale to hundreds of profiles with volume discounts.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4" className="border border-secondary-200 rounded-xl px-6 data-[state=open]:bg-secondary-50">
              <AccordionTrigger className="text-base sm:text-lg font-medium text-secondary-900 py-5 hover:no-underline">
                How do client approvals work?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 text-base leading-relaxed pb-5">
                Clients receive email notifications with a unique link. They can preview, comment, and approve content with one click—no account required.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <FaqSchema items={[
            { question: 'How is pricing handled for agencies?', answer: 'Our Agency plan includes 5 workspaces and 10 users. External clients are free.' },
            { question: 'Can I white-label the platform?', answer: 'Yes, on our Enterprise plan, you can use your own domain and branding.' },
            { question: 'Is there a limit on social accounts?', answer: 'Agency plans include 30 social profiles with no upper limit.' },
            { question: 'How do client approvals work?', answer: 'Clients receive email notifications and can approve with one click—no account required.' }
          ]} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-indigo-100 via-blue-100 to-indigo-100 rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/50 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200/50 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
                Ready to scale your agency?
              </h2>
              <p className="text-lg sm:text-xl text-secondary-600 mb-8 max-w-xl mx-auto">
                Join hundreds of agencies managing clients more efficiently with Xocial.
              </p>
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="px-8 sm:px-10 h-14 rounded-full text-lg shadow-xl hover:scale-105 transition-transform"
                >
                  Start Agency Trial
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
