'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Calendar,
  BarChart3,
  Users,
  Zap,
  TrendingUp,
  Play,
  CheckCircle2,
  ArrowRight,
  Globe,
  Shield,
  Workflow,
  Bot,
  Clock,
  Star,
  ChevronRight,
} from "lucide-react";
import OptimizedImage from "@/components/ui/optimized-image";
import { trackEngagement } from "@/lib/performance-monitoring";
import MarketingLayout from '@/components/marketing/layout'
import TestimonialsCarousel from '@/components/marketing/testimonials-carousel'

const platforms = [
  { name: 'Instagram', color: 'from-pink-500 to-purple-500' },
  { name: 'Facebook', color: 'from-blue-600 to-blue-400' },
  { name: 'LinkedIn', color: 'from-blue-700 to-blue-500' },
  { name: 'Twitter/X', color: 'from-gray-900 to-gray-700' },
  { name: 'TikTok', color: 'from-pink-600 to-cyan-400' },
]

const features = [
  {
    icon: Calendar,
    title: 'Visual Calendar',
    description: 'Plan your content with drag-and-drop simplicity. See your entire strategy at a glance.',
    color: 'blue',
    href: '/product/plan'
  },
  {
    icon: Bot,
    title: 'AI Assistant',
    description: 'Generate captions, hashtags, and content ideas with our intelligent AI copilot.',
    color: 'purple',
    href: '/product/create'
  },
  {
    icon: Workflow,
    title: 'Approval Workflows',
    description: 'Streamlined feedback and approval process. No more email chains.',
    color: 'green',
    href: '/product/approve'
  },
  {
    icon: BarChart3,
    title: 'Deep Analytics',
    description: 'Understand what works with actionable insights and performance metrics.',
    color: 'orange',
    href: '/product/analyze'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Work together seamlessly with comments, mentions, and real-time updates.',
    color: 'pink',
    href: '/product/collaborate'
  },
  {
    icon: Clock,
    title: 'Smart Scheduling',
    description: 'Post at the perfect time with AI-powered optimal scheduling suggestions.',
    color: 'cyan',
    href: '/product/schedule'
  },
]

const colorClasses = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500' },
  green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-500' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-500' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-500' },
}

const stats = [
  { value: '10K+', label: 'Active users' },
  { value: '50M+', label: 'Posts scheduled' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9/5', label: 'User rating' },
]

export default function Home() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-16 lg:pt-24 pb-20 lg:pb-32 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-primary-300/30 via-primary-200/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-purple-300/20 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-60 left-0 w-[300px] h-[300px] bg-gradient-to-br from-blue-300/20 to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-purple-100 text-primary-700 backdrop-blur-sm border border-primary-200/50 mb-8">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-semibold">The Intelligent Social Suite</span>
              <ChevronRight className="h-4 w-4" />
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-secondary-900 mb-6">
              Social Media Chaos,{' '}
              <span className="relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600">
                  Finally Solved.
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 10C70 4 130 4 298 10" stroke="url(#gradient)" strokeWidth="4" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="300" y2="0">
                      <stop stopColor="#0d9488" />
                      <stop offset="0.5" stopColor="#6366f1" />
                      <stop offset="1" stopColor="#9333ea" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl md:text-2xl text-secondary-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Plan, collaborate, and publish with the only AI-native platform designed for modern marketing teams.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-105 transition-all duration-300"
                  onClick={() => trackEngagement({ event: 'cta_click', label: 'cta_hero_signup' })}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-lg rounded-full border-2 hover:bg-secondary-50 group"
                >
                  <Play className="mr-2 h-5 w-5 fill-current group-hover:scale-110 transition-transform" />
                  Watch Demo
                </Button>
              </Link>
            </div>

            {/* Platform badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
              <span className="text-sm text-secondary-500 font-medium">Works with:</span>
              {platforms.map((platform) => (
                <div
                  key={platform.name}
                  className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${platform.color} text-white text-xs font-semibold shadow-sm`}
                >
                  {platform.name}
                </div>
              ))}
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative mx-auto max-w-6xl">
            <div className="rounded-2xl bg-secondary-900/5 p-2 ring-1 ring-inset ring-secondary-900/10 lg:-m-4 lg:rounded-3xl lg:p-4">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl lg:rounded-2xl shadow-2xl border border-secondary-200/50 bg-secondary-50">
                <OptimizedImage
                  src="/landing/hero-dashboard.png"
                  alt="Xocial Dashboard - AI-powered social media management"
                  fill
                  className="object-cover"
                  priority
                />

                {/* Floating Elements */}
                <div className="absolute top-4 right-4 sm:top-8 sm:right-8 bg-white/95 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-xl border border-secondary-200 animate-float hidden sm:block">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-secondary-900">+127%</div>
                      <div className="text-xs text-secondary-500">Engagement this week</div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 bg-white/95 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-xl border border-secondary-200 animate-float delay-500 hidden sm:block">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-secondary-900">Post approved!</div>
                      <div className="text-xs text-secondary-500">Scheduling for tomorrow</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary-500/20 blur-[100px] rounded-full" />
          </div>
        </div>
      </section>

      {/* Social Proof - Stats */}
      <section className="py-12 sm:py-16 border-y border-secondary-100 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm sm:text-base text-secondary-500 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logo bar */}
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-12 border-t border-secondary-100">
          <p className="text-sm font-semibold text-secondary-400 uppercase tracking-wider mb-8 text-center">
            Trusted by innovative teams worldwide
          </p>
          <div className="relative h-12 sm:h-16 w-full max-w-4xl mx-auto opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <OptimizedImage
              src="/landing/social-proof.png"
              alt="Trusted by leading brands"
              fill
              className="object-contain"
            />
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-20 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-100 text-secondary-700 mb-6">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-semibold">Powerful Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6 tracking-tight">
              Everything you need to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">
                dominate social
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-secondary-600 leading-relaxed">
              A complete toolkit for planning, creating, approving, and analyzing your social media presence.
            </p>
          </div>

          <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const colors = colorClasses[feature.color as keyof typeof colorClasses]
              return (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className={`group p-6 sm:p-8 rounded-2xl bg-white border-2 border-secondary-100 hover:${colors.border} shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
                >
                  <div className={`h-14 w-14 rounded-2xl ${colors.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`h-7 w-7 ${colors.text}`} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-secondary-900 mb-3 group-hover:text-primary-700 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-secondary-600 leading-relaxed mb-4">
                    {feature.description}
                  </p>
                  <div className={`inline-flex items-center gap-2 ${colors.text} font-semibold text-sm group-hover:gap-3 transition-all`}>
                    Learn more <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Feature Spotlight 1: Calendar */}
      <section className="py-20 lg:py-32 overflow-hidden bg-gradient-to-b from-white to-secondary-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 xl:gap-24 items-center">
            <div className="mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 mb-6 font-semibold">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Visual Planning</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6 tracking-tight leading-tight">
                See the big picture,{' '}
                <span className="text-blue-600">miss nothing.</span>
              </h2>
              <p className="text-lg sm:text-xl text-secondary-600 mb-8 leading-relaxed">
                Drag-and-drop your way to a perfect feed. Our calendar gives you a bird&apos;s-eye view of your entire social strategy across all platforms.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Multi-channel view (Instagram, LinkedIn, X, and more)',
                  'Drag and drop rescheduling',
                  'Status indicators for Draft, Approval, Published',
                  'Holiday & event reminders built-in'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-secondary-700 font-medium text-base sm:text-lg">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/product/plan">
                <Button size="lg" variant="outline" className="rounded-full h-12 px-6">
                  Explore Calendar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-blue-200/60 via-blue-100/40 to-transparent rounded-full blur-3xl -z-10" />
              <div className="rounded-2xl sm:rounded-3xl shadow-2xl border border-secondary-200 overflow-hidden bg-white hover:scale-[1.02] transition-transform duration-500">
                <OptimizedImage
                  src="/landing/feature-calendar.png"
                  alt="Xocial Calendar - Visual content planning"
                  width={800}
                  height={600}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Spotlight 2: AI Composer */}
      <section className="py-20 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 xl:gap-24 items-center">
            <div className="order-2 lg:order-1 relative mb-12 lg:mb-0">
              <div className="absolute -inset-4 bg-gradient-to-tl from-purple-200/60 via-purple-100/40 to-transparent rounded-full blur-3xl -z-10" />
              <div className="rounded-2xl sm:rounded-3xl shadow-2xl border border-secondary-200 overflow-hidden bg-white hover:scale-[1.02] transition-transform duration-500">
                <OptimizedImage
                  src="/landing/feature-composer.png"
                  alt="Xocial Composer - AI-powered content creation"
                  width={800}
                  height={600}
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 mb-6 font-semibold">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm">AI-Powered Creation</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6 tracking-tight leading-tight">
                Create better content,{' '}
                <span className="text-purple-600">10x faster.</span>
              </h2>
              <p className="text-lg sm:text-xl text-secondary-600 mb-8 leading-relaxed">
                Start with a spark. Our AI helps you draft captions, find hashtags, and resize images for every platform instantly.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Platform-specific previews (WYSIWYG)',
                  'AI caption generation & tone adjustment',
                  'Unified media library access',
                  'Cross-posting with one click'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-secondary-700 font-medium text-base sm:text-lg">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/product/create">
                <Button size="lg" variant="outline" className="rounded-full h-12 px-6">
                  Explore Composer <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Educational Video Section */}
      <section id="demo" className="py-20 lg:py-32 bg-secondary-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary-800 via-secondary-900 to-black opacity-80" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
              Master Your Social Media Strategy
            </h2>
            <p className="text-secondary-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
              Learn how top teams use workflows to scale their presence without scaling the chaos.
            </p>
          </div>

          <div className="max-w-5xl mx-auto rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-secondary-700/50 bg-black aspect-video relative group">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/K4TOrB7at0Y?si=generic_strategy"
              title="Social Media Strategy Guide"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0"
            />
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-4 sm:gap-6">
            {[
              { icon: Zap, label: "Proven Workflows", color: "text-yellow-400 bg-yellow-400/10" },
              { icon: Users, label: "Team Collaboration", color: "text-blue-400 bg-blue-400/10" },
              { icon: TrendingUp, label: "Growth Tactics", color: "text-green-400 bg-green-400/10" }
            ].map((pill, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 ${pill.color} backdrop-blur-sm px-5 sm:px-6 py-3 sm:py-4 rounded-full border border-white/10 hover:bg-white/10 transition-colors`}
              >
                <pill.icon className="h-5 w-5" />
                <span className="font-semibold text-white text-sm sm:text-base">{pill.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Spotlight 3: Analytics */}
      <section className="py-20 lg:py-32 overflow-hidden bg-gradient-to-b from-secondary-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 xl:gap-24 items-center">
            <div className="mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 mb-6 font-semibold">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">Deep Analytics</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6 tracking-tight leading-tight">
                Turn data into{' '}
                <span className="text-orange-600">winning strategies.</span>
              </h2>
              <p className="text-lg sm:text-xl text-secondary-600 mb-8 leading-relaxed">
                Stop guessing. Get detailed insights into what performs, when to post, and who your audience really is.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Real-time performance dashboards',
                  'AI-powered content recommendations',
                  'Competitor benchmarking',
                  'Customizable reports for stakeholders'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-secondary-700 font-medium text-base sm:text-lg">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/product/analyze">
                <Button size="lg" variant="outline" className="rounded-full h-12 px-6">
                  Explore Analytics <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-orange-200/60 via-orange-100/40 to-transparent rounded-full blur-3xl -z-10" />
              <div className="rounded-2xl sm:rounded-3xl shadow-2xl border border-secondary-200 overflow-hidden bg-white hover:scale-[1.02] transition-transform duration-500">
                <OptimizedImage
                  src="/landing/feature-analytics.png"
                  alt="Xocial Analytics - Data-driven insights"
                  width={800}
                  height={600}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Trust Section */}
      <section className="py-16 sm:py-20 bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              { icon: Shield, title: 'Enterprise Security', desc: 'SOC2 compliant with end-to-end encryption' },
              { icon: Globe, title: '99.99% Uptime', desc: 'Globally distributed infrastructure' },
              { icon: Users, title: 'Team-First Design', desc: 'Built for real collaboration workflows' },
              { icon: Star, title: 'Award Winning', desc: 'Rated #1 by G2 and Capterra' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-secondary-100 shadow-sm">
                <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-bold text-secondary-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-secondary-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-100 text-pink-700 mb-6">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm font-semibold">Customer Love</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-900 mb-4 tracking-tight">
              Loved by Creators & Teams
            </h2>
            <p className="text-lg text-secondary-600">
              Join 10,000+ teams shipping faster.
            </p>
          </div>
          <div className="flex justify-center">
            <TestimonialsCarousel />
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800" />
        <div className="absolute inset-0 bg-[url('/landing/grid-pattern.svg')] opacity-10" />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <Globe className="h-16 w-16 text-primary-200 mx-auto mb-8 animate-pulse" />
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight">
            Ready to streamline your social workflow?
          </h2>
          <p className="text-lg sm:text-xl text-primary-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join the planners, creators, and agencies using Xocial to save 10+ hours a week.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/auth/signup">
              <Button
                size="lg"
                variant="secondary"
                className="h-14 px-8 text-lg w-full sm:w-auto shadow-xl hover:scale-105 transition-transform"
                onClick={() => trackEngagement({ event: 'cta_click', label: 'cta_footer_signup' })}
              >
                Get Started For Free
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg w-full sm:w-auto border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                Contact Sales
              </Button>
            </Link>
          </div>
          <p className="mt-8 text-sm text-primary-200/80">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

    </MarketingLayout>
  );
}
