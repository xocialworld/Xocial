'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import FaqSchema from '@/components/marketing/faq-schema'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import OptimizedImage from '@/components/ui/optimized-image'
import {
  Sparkles,
  CheckCircle2,
  Play,
  Palette,
  Wand2,
  Layers,
  ArrowRight,
  Bot,
  Image as ImageIcon,
  Type,
  Hash
} from 'lucide-react'
import MarketingLayout from '@/components/marketing/layout'

const features = [
  {
    icon: Layers,
    title: 'Unified Workflow',
    description: 'Draft once, adapt per platform. No more tab switching or copy-pasting chaos between different social networks.',
    color: 'purple',
    points: ['Multi-channel support', 'Live platform previews', 'Version history']
  },
  {
    icon: Bot,
    title: 'AI Assistant',
    description: 'Generate captions, hashtags, and rewrite content to match your brand voice instantly with our intelligent AI.',
    color: 'pink',
    points: ['Smart suggestions', 'Tone adjustment', 'Brand voice training']
  },
  {
    icon: CheckCircle2,
    title: 'Approval Ready',
    description: 'Built-in approval workflows ensure nothing goes live without the right sign-off from your team or clients.',
    color: 'blue',
    points: ['Team collaboration', 'Audit trails', 'Client portals']
  },
]

const aiCapabilities = [
  { icon: Type, label: 'Caption Generation', description: 'AI writes compelling captions' },
  { icon: Hash, label: 'Hashtag Research', description: 'Trending tags for your niche' },
  { icon: Wand2, label: 'Tone Rewriting', description: 'Casual, professional, witty' },
  { icon: ImageIcon, label: 'Image Suggestions', description: 'Stock photo recommendations' },
]

const colorClasses = {
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
}

export default function CreatePage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative pt-12 sm:pt-16 lg:pt-24 pb-20 lg:pb-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-purple-200/40 via-purple-100/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-pink-200/30 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 xl:gap-24 items-center">
            <div className="mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 mb-6 font-semibold border border-purple-200/50">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm">AI-Powered Creator</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary-900 mb-6 tracking-tight leading-tight">
                Create content that{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600">
                  connects
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-secondary-600 mb-8 leading-relaxed max-w-lg">
                Draft, edit, and perfect your posts for every platform in one unified interface. Let AI handle the heavy lifting while you focus on creativity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto rounded-full px-8 h-14 text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300"
                  >
                    Start Creating Free
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
              <div className="absolute -inset-4 bg-gradient-to-br from-purple-200/60 via-pink-100/40 to-transparent rounded-full blur-3xl -z-10" />
              <div className="rounded-2xl sm:rounded-3xl shadow-2xl border border-secondary-200 overflow-hidden bg-white hover:scale-[1.02] transition-transform duration-500">
                <OptimizedImage
                  src="/landing/feature-composer.png"
                  alt="Xocial Composer - AI-powered content creation interface"
                  width={800}
                  height={600}
                  priority
                  className="w-full h-auto"
                />
              </div>

              {/* Floating AI Badge */}
              <div className="absolute -bottom-4 -right-4 sm:bottom-8 sm:right-8 bg-white rounded-xl p-4 shadow-xl border border-secondary-200 animate-float hidden sm:flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-secondary-900">AI Suggestion</div>
                  <div className="text-xs text-secondary-500">Caption generated ✨</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Capabilities Strip */}
      <section className="py-12 sm:py-16 bg-secondary-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">AI-Powered Content Creation</h2>
            <p className="text-secondary-400">Let AI supercharge your creative workflow</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {aiCapabilities.map((item, index) => (
              <div
                key={index}
                className="text-center p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">{item.label}</h3>
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
              Everything you need to create amazing content
            </h2>
            <p className="text-lg text-secondary-600">
              One unified platform for all your content creation needs.
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
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-purple-900/40 to-transparent" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-8 lg:mb-10 tracking-tight">
                See Content Creation in Action
              </h2>
              <div className="max-w-5xl mx-auto aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-secondary-700 bg-black relative">
                <iframe
                  className="w-full h-full absolute inset-0"
                  src="https://www.youtube.com/embed/K4TOrB7at0Y"
                  title="Content Creation Workflow Demo"
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
            <p className="text-secondary-600">Everything you need to know about content creation with Xocial</p>
          </div>
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="q1" className="border border-secondary-200 rounded-xl px-6 data-[state=open]:bg-secondary-50">
              <AccordionTrigger className="text-base sm:text-lg font-medium text-secondary-900 py-5 hover:no-underline">
                Can I post to Instagram and LinkedIn at the same time?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 text-base leading-relaxed pb-5">
                Yes! You can create a master draft and customize it for each platform in one go. Each platform gets its own optimized version while maintaining your core message.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2" className="border border-secondary-200 rounded-xl px-6 data-[state=open]:bg-secondary-50">
              <AccordionTrigger className="text-base sm:text-lg font-medium text-secondary-900 py-5 hover:no-underline">
                Does the AI assistant cost extra?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 text-base leading-relaxed pb-5">
                The AI assistant is included in Pro and Growth plans with generous usage limits. Free plans get limited AI suggestions to try the feature.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3" className="border border-secondary-200 rounded-xl px-6 data-[state=open]:bg-secondary-50">
              <AccordionTrigger className="text-base sm:text-lg font-medium text-secondary-900 py-5 hover:no-underline">
                How do approvals work?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 text-base leading-relaxed pb-5">
                You can assign team members or external clients to approve posts before they are scheduled. They&apos;ll get notified instantly via email and can approve with one click.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4" className="border border-secondary-200 rounded-xl px-6 data-[state=open]:bg-secondary-50">
              <AccordionTrigger className="text-base sm:text-lg font-medium text-secondary-900 py-5 hover:no-underline">
                Can I train the AI on my brand voice?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 text-base leading-relaxed pb-5">
                Yes! On Growth and Agency plans, you can provide brand guidelines and example content to help the AI learn your unique voice and style.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <FaqSchema items={[
            { question: 'Can I post to Instagram and LinkedIn at the same time?', answer: 'Yes! You can create a master draft and customize it for each platform in one go.' },
            { question: 'Does the AI assistant cost extra?', answer: 'The AI assistant is included in Pro and Growth plans with generous usage limits.' },
            { question: 'How do approvals work?', answer: 'You can assign team members to approve posts before they are scheduled. They will get notified instantly.' },
            { question: 'Can I train the AI on my brand voice?', answer: 'Yes! On Growth and Agency plans, you can provide brand guidelines and example content to help the AI learn your unique voice and style.' }
          ]} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-purple-100 via-pink-100 to-purple-100 rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/50 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-200/50 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
                Ready to create better content?
              </h2>
              <p className="text-lg sm:text-xl text-secondary-600 mb-8 max-w-xl mx-auto">
                Join thousands of marketers saving 10+ hours a week with AI-powered content creation.
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
