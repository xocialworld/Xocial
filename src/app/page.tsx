'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, 
  Calendar, 
  BarChart3, 
  Users, 
  Zap,
  Shield,
  Globe,
  TrendingUp,
  Star
} from "lucide-react";
import OptimizedImage from "@/components/ui/optimized-image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trackEngagement } from "@/lib/performance-monitoring";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <nav className="border-b border-secondary-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary-600" />
              <span className="text-2xl font-bold text-secondary-900">Xocial</span>
            </div>
            
            <div className="flex gap-4">
              <Link href="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI-Powered Social Media Management</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-secondary-900">
            Command Center for Modern Teams
          </h1>
          <p className="text-xl text-secondary-600 max-w-2xl">
            Connect accounts, create with AI, schedule visually, and analyze performance — all unified in Xocial.
          </p>
          <div className="flex gap-4">
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg px-8" onClick={() => trackEngagement({ event: 'cta_click', label: 'cta_hero_signup' })}>Start Free Trial</Button>
            </Link>
            <Link href="/c">
              <Button size="lg" variant="secondary" className="text-lg px-8">Watch Demo</Button>
            </Link>
          </div>
        </div>
          <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="order-2 lg:order-1 grid grid-cols-2 gap-4">
              <Card className="border-2 hover:border-primary-300 transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary-600" />
                    <h3 className="font-semibold text-secondary-900">Multi-Account Management</h3>
                  </div>
                  <p className="mt-2 text-sm text-secondary-600">Connect via OAuth, view posts, and reply to comments inline</p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-primary-300 transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-primary-600" />
                    <h3 className="font-semibold text-secondary-900">AI Content Assistant</h3>
                  </div>
                  <p className="mt-2 text-sm text-secondary-600">Generate captions, hashtags, strategy notes via a unified AI Gateway</p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-primary-300 transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-6 w-6 text-primary-600" />
                    <h3 className="font-semibold text-secondary-900">Visual Calendar</h3>
                  </div>
                  <p className="mt-2 text-sm text-secondary-600">Plan and schedule posts with platform filters and day details</p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-primary-300 transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-6 w-6 text-primary-600" />
                    <h3 className="font-semibold text-secondary-900">Analytics & Insights</h3>
                  </div>
                  <p className="mt-2 text-sm text-secondary-600">Dashboards, top posts, and AI summaries with export options</p>
                </CardContent>
              </Card>
            </div>
            <div className="order-1 lg:order-2 relative h-[320px] sm:h-[400px] rounded-xl overflow-hidden">
              <OptimizedImage src="/icon-512.png" alt="Xocial" fill priority className="object-contain p-8" />
            </div>
          </div>
        {/* Single Feature Showcase Section */}
        <section id="features" className="mt-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-left">
              <div className="h-16 w-16 bg-success-100 rounded-full flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-success-600" />
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">Fast, Focused Workflow</h3>
              <p className="text-secondary-600">Designed for speed — streamlined flows for connect, organize, create, and analyze.</p>
            </div>
            <div className="text-left">
              <div className="h-16 w-16 bg-info-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-info-600" />
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">Secure By Design</h3>
              <p className="text-secondary-600">Supabase Auth, OAuth tokens server-side, RLS policies for team data.</p>
            </div>
            <div className="text-left">
              <div className="h-16 w-16 bg-warning-100 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-warning-600" />
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">Results You Can Measure</h3>
              <p className="text-secondary-600">Analytics dashboards, top posts, and exports — with AI insights for action.</p>
            </div>
          </div>
        </section>
      </section>

      {/* Differentiators Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-secondary-900">Why XOCIAL</h2>
            <p className="mt-2 text-secondary-600">Built for creators and teams who need AI-first creation, calendar organization, and actionable analytics</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">AI-First Content Studio</h3>
                <p className="text-secondary-700">Structured prompts, platform variants, and refinements via Vercel AI Gateway.</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">Calendar & Team Workflows</h3>
                <p className="text-secondary-700">Organize posts by date, platform, and status with RLS-backed multi-user roles.</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">Analytics That Drive Action</h3>
                <p className="text-secondary-700">KPIs, time-series, top posts, and AI insights to plan the next week.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-secondary-900">Loved by Creators and Teams</h2>
            <p className="mt-2 text-secondary-600">Testimonials from early adopters</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>AK</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-secondary-900">Anika K.</p>
                    <p className="text-sm text-secondary-500">Social Media Lead</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-warning-600">
                  <Star className="h-4 w-4 fill-warning-600" />
                  <Star className="h-4 w-4 fill-warning-600" />
                  <Star className="h-4 w-4 fill-warning-600" />
                  <Star className="h-4 w-4 fill-warning-600" />
                  <Star className="h-4 w-4 fill-warning-600" />
                </div>
                <p className="mt-4 text-secondary-700">Our team schedules faster and our engagement is up 30%.</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-secondary-900">Jordan S.</p>
                    <p className="text-sm text-secondary-500">Founder</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-warning-600">
                  <Star className="h-4 w-4 fill-warning-600" />
                  <Star className="h-4 w-4 fill-warning-600" />
                  <Star className="h-4 w-4 fill-warning-600" />
                  <Star className="h-4 w-4 fill-warning-600" />
                  <Star className="h-4 w-4 fill-warning-600" />
                </div>
                <p className="mt-4 text-secondary-700">AI suggestions save us hours each week.</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>RM</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-secondary-900">Ravi M.</p>
                    <p className="text-sm text-secondary-500">Agency Manager</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-warning-600">
                  <Star className="h-4 w-4 fill-warning-600" />
                  <Star className="h-4 w-4 fill-warning-600" />
                  <Star className="h-4 w-4 fill-warning-600" />
                  <Star className="h-4 w-4 fill-warning-600" />
                  <Star className="h-4 w-4 fill-warning-600" />
                </div>
                <p className="mt-4 text-secondary-700">One platform that finally unifies our workflow.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-primary-600 to-primary-700 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Globe className="h-16 w-16 text-white mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Social Media?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Streamline your social media workflow with AI creation, scheduling, and analytics
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8" onClick={() => trackEngagement({ event: 'cta_click', label: 'cta_footer_signup' })}>
              Get Started For Free
            </Button>
          </Link>
          <p className="mt-4 text-sm text-primary-100">
            No credit card required • 14-day free trial
          </p>
        </div>
      </section>

      <footer className="bg-secondary-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6" />
              <span className="text-xl font-bold">Xocial</span>
            </div>
              <p className="text-secondary-400 text-sm">
                AI-powered social media management for modern teams
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li><Link href="/features/ai-assistant" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_ai_assistant' })}>AI Content Assistant</Link></li>
                <li><Link href="/features/content-calendar" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_calendar' })}>Content Calendar</Link></li>
                <li><Link href="/features/analytics" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_analytics' })}>Analytics Dashboards</Link></li>
                <li><Link href="/features/accounts" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_accounts' })}>Multi-Account Management</Link></li>
                <li><Link href="/features/templates" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_templates' })}>Templates</Link></li>
                <li><Link href="/features/media" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_media' })}>Media Library</Link></li>
                <li><Link href="/features/campaigns" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_campaigns' })}>Campaigns</Link></li>
                <li><Link href="/features/compose" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_compose' })}>Compose</Link></li>
                <li><Link href="/features/integrations" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_integrations' })}>Integrations</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Solutions</h4>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li><Link href="/settings" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_roles_rls' })}>Team Roles & Access (RLS)</Link></li>
                <li><Link href="/l" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_strategy' })}>Strategy (Coming Soon)</Link></li>
                <li><Link href="/i" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_influence' })}>Influence (Coming Soon)</Link></li>
                <li><a href="mailto:support@xocial.world" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><span className="hover:text-white text-secondary-500">Terms (Coming Soon)</span></li>
                <li><span className="hover:text-white text-secondary-500">Security (Coming Soon)</span></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-secondary-800 mt-12 pt-8 text-center text-sm text-secondary-400">
            <p>© 2025 Xocial. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

