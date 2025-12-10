'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Menu,
  X,
  ChevronDown,
  Palette,
  Calendar,
  CheckCircle,
  MessageSquare,
  Clock,
  BarChart3,
  Building2,
  Briefcase,
  MapPin
} from 'lucide-react'
import { trackEngagement } from '@/lib/performance-monitoring'

const productLinks = [
  { href: '/product/create', label: 'Create', icon: Palette, description: 'AI-powered content creation' },
  { href: '/product/plan', label: 'Plan', icon: Calendar, description: 'Visual content calendar' },
  { href: '/product/approve', label: 'Approve', icon: CheckCircle, description: 'Streamlined approval workflows' },
  { href: '/product/collaborate', label: 'Collaborate', icon: MessageSquare, description: 'Team collaboration tools' },
  { href: '/product/schedule', label: 'Schedule', icon: Clock, description: 'Smart scheduling & publishing' },
  { href: '/product/analyze', label: 'Analyze', icon: BarChart3, description: 'Deep analytics & insights' },
]

const solutionLinks = [
  { href: '/solutions/brands', label: 'Brands', icon: Building2, description: 'For in-house marketing teams' },
  { href: '/solutions/agencies', label: 'Agencies', icon: Briefcase, description: 'Multi-client management' },
  { href: '/solutions/multi-location', label: 'Multi-location', icon: MapPin, description: 'Franchise & local pages' },
]

export default function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [productDropdownOpen, setProductDropdownOpen] = useState(false)
  const [solutionDropdownOpen, setSolutionDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      role="banner"
      aria-label="Site header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-secondary-100'
          : 'bg-white/80 backdrop-blur-sm border-b border-secondary-200/50'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center gap-2 group">
            <div className="relative">
              <Sparkles className="h-8 w-8 text-primary-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" aria-hidden />
              <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <Link href="/" className="text-2xl font-bold text-secondary-900 tracking-tight" aria-label="Xocial home">
              Xocial
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-1">
            {/* Product Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setProductDropdownOpen(true)}
              onMouseLeave={() => setProductDropdownOpen(false)}
            >
              <button
                className="flex items-center gap-1 px-4 py-2 text-secondary-700 hover:text-secondary-900 font-medium rounded-lg hover:bg-secondary-100/50 transition-all duration-200"
                aria-expanded={productDropdownOpen}
              >
                Product
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${productDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              <div
                className={`absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-secondary-100 p-3 transition-all duration-300 ${productDropdownOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                  }`}
              >
                <div className="grid gap-1">
                  {productLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary-50 transition-colors duration-200 group"
                    >
                      <div className="p-2 rounded-lg bg-primary-100 text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-200">
                        <link.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-secondary-900">{link.label}</div>
                        <div className="text-sm text-secondary-500">{link.description}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Solutions Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setSolutionDropdownOpen(true)}
              onMouseLeave={() => setSolutionDropdownOpen(false)}
            >
              <button
                className="flex items-center gap-1 px-4 py-2 text-secondary-700 hover:text-secondary-900 font-medium rounded-lg hover:bg-secondary-100/50 transition-all duration-200"
                aria-expanded={solutionDropdownOpen}
              >
                Solutions
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${solutionDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <div
                className={`absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-secondary-100 p-3 transition-all duration-300 ${solutionDropdownOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                  }`}
              >
                <div className="grid gap-1">
                  {solutionLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary-50 transition-colors duration-200 group"
                    >
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                        <link.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-secondary-900">{link.label}</div>
                        <div className="text-sm text-secondary-500">{link.description}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link href="/pricing" className="px-4 py-2 text-secondary-700 hover:text-secondary-900 font-medium rounded-lg hover:bg-secondary-100/50 transition-all duration-200">
              Pricing
            </Link>
            <Link href="/resources" className="px-4 py-2 text-secondary-700 hover:text-secondary-900 font-medium rounded-lg hover:bg-secondary-100/50 transition-all duration-200">
              Resources
            </Link>
            <Link href="/customers" className="px-4 py-2 text-secondary-700 hover:text-secondary-900 font-medium rounded-lg hover:bg-secondary-100/50 transition-all duration-200">
              Customers
            </Link>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/auth/login" onClick={() => trackEngagement({ event: 'nav_click', label: 'header_signin' })}>
              <Button variant="ghost" className="font-medium hover:bg-secondary-100">Sign In</Button>
            </Link>
            <Link href="/auth/signup" onClick={() => trackEngagement({ event: 'nav_click', label: 'header_get_started' })}>
              <Button className="rounded-full px-6 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300">
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-secondary-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-secondary-700" />
            ) : (
              <Menu className="h-6 w-6 text-secondary-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden absolute top-full left-0 right-0 bg-white border-b border-secondary-200 shadow-xl transition-all duration-300 overflow-hidden ${mobileMenuOpen ? 'max-h-[calc(100vh-4rem)] opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <nav className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Product Links */}
          <div>
            <div className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-3">Product</div>
            <div className="grid grid-cols-2 gap-2">
              {productLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary-50 hover:bg-secondary-100 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <link.icon className="h-5 w-5 text-primary-600" />
                  <span className="font-medium text-secondary-900">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Solution Links */}
          <div>
            <div className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-3">Solutions</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {solutionLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary-50 hover:bg-secondary-100 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <link.icon className="h-5 w-5 text-indigo-600" />
                  <span className="font-medium text-secondary-900">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Other Links */}
          <div className="flex flex-wrap gap-2">
            <Link href="/pricing" className="px-4 py-2 text-secondary-700 font-medium rounded-lg bg-secondary-50 hover:bg-secondary-100" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </Link>
            <Link href="/resources" className="px-4 py-2 text-secondary-700 font-medium rounded-lg bg-secondary-50 hover:bg-secondary-100" onClick={() => setMobileMenuOpen(false)}>
              Resources
            </Link>
            <Link href="/customers" className="px-4 py-2 text-secondary-700 font-medium rounded-lg bg-secondary-50 hover:bg-secondary-100" onClick={() => setMobileMenuOpen(false)}>
              Customers
            </Link>
            <Link href="/support" className="px-4 py-2 text-secondary-700 font-medium rounded-lg bg-secondary-50 hover:bg-secondary-100" onClick={() => setMobileMenuOpen(false)}>
              Support
            </Link>
          </div>

          {/* Mobile CTA */}
          <div className="flex flex-col gap-3 pt-4 border-t border-secondary-200">
            <Link href="/auth/login" className="w-full" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full h-12 text-base font-semibold">Sign In</Button>
            </Link>
            <Link href="/auth/signup" className="w-full" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full h-12 text-base font-semibold shadow-lg">Get Started Free</Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
