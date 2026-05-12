'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sparkles,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  ArrowRight,
  Mail,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { trackEngagement } from '@/lib/performance-monitoring'

const footerSections = {
  product: {
    title: 'Product',
    links: [
      { href: '/product/create', label: 'Create' },
      { href: '/product/plan', label: 'Plan' },
      { href: '/product/approve', label: 'Approve' },
      { href: '/product/collaborate', label: 'Collaborate' },
      { href: '/product/schedule', label: 'Schedule' },
      { href: '/product/analyze', label: 'Analyze' },
    ]
  },
  solutions: {
    title: 'Solutions',
    links: [
      { href: '/solutions/brands', label: 'For Brands' },
      { href: '/solutions/agencies', label: 'For Agencies' },
      { href: '/solutions/multi-location', label: 'Multi-location' },
    ]
  },
  resources: {
    title: 'Resources',
    links: [
      { href: '/resources/guides', label: 'Guides' },
      { href: '/resources/templates', label: 'Templates' },
      { href: '/blog', label: 'Blog' },
      { href: '/customers', label: 'Customer Stories' },
      { href: '/support', label: 'Help Center' },
    ]
  },
  company: {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/careers', label: 'Careers' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: '/data-deletion', label: 'Data Deletion' },
    ]
  }
}

const socialLinks = [
  { href: 'https://twitter.com/xocial', icon: Twitter, label: 'Twitter' },
  { href: 'https://linkedin.com/company/xocial', icon: Linkedin, label: 'LinkedIn' },
  { href: 'https://instagram.com/xocial', icon: Instagram, label: 'Instagram' },
  { href: 'https://youtube.com/@xocial', icon: Youtube, label: 'YouTube' },
]

export default function MarketingFooter() {
  const [email, setEmail] = useState('')
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setSubscribeStatus('loading')
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSubscribeStatus('success')
    setEmail('')
    trackEngagement({ event: 'cta_click', label: 'newsletter_subscribe_footer' })

    // Reset after 3 seconds
    setTimeout(() => setSubscribeStatus('idle'), 3000)
  }

  return (
    <footer role="contentinfo" className="relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-900 via-secondary-950 to-black" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />

      <div className="relative z-10">
        {/* Newsletter Section */}
        <div className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
                <Mail className="h-4 w-4 text-primary-400" />
                <span className="text-sm font-medium text-white/80">Stay in the loop</span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Get social media tips & updates
              </h3>
              <p className="text-lg text-secondary-400 mb-8">
                Join 10,000+ marketers getting weekly insights on social strategy, content trends, and platform updates.
              </p>

              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <div className="flex-1 relative">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 bg-white/5 border-white/10 text-white placeholder:text-secondary-500 focus:border-primary-500 focus:ring-primary-500/20 rounded-xl pr-12"
                    disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="h-14 px-8 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all duration-300"
                  disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
                >
                  {subscribeStatus === 'loading' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : subscribeStatus === 'success' ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Subscribed!
                    </>
                  ) : (
                    <>
                      Subscribe
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
              <p className="text-xs text-secondary-500 mt-4">
                No spam, ever. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-3 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6 group">
                <Sparkles className="h-8 w-8 text-primary-400" aria-hidden />
                <span className="text-2xl font-bold text-white">Xocial</span>
              </div>
              <p className="text-secondary-400 text-base leading-relaxed mb-6 max-w-sm">
                The AI-powered social media management platform for modern marketing teams. Plan, collaborate, and publish with confidence.
              </p>

              {/* Social Links */}
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-secondary-400 hover:text-white transition-all duration-300 hover:scale-110"
                    aria-label={social.label}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link Sections */}
            {Object.entries(footerSections).map(([key, section]) => (
              <div key={key}>
                <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-secondary-400 hover:text-white transition-colors duration-200 text-sm"
                        onClick={() => trackEngagement({ event: 'nav_click', label: `footer_${key}_${link.label.toLowerCase().replace(' ', '_')}` })}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-secondary-500">
                © {new Date().getFullYear()} Xocial. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <Link href="/privacy" className="text-sm text-secondary-500 hover:text-secondary-300 transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-sm text-secondary-500 hover:text-secondary-300 transition-colors">
                  Terms of Service
                </Link>
                <Link href="/data-deletion" className="text-sm text-secondary-500 hover:text-secondary-300 transition-colors">
                  Data Deletion
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
