'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import Link from 'next/link'
import FaqSchema from '@/components/marketing/faq-schema'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Calculator, Zap, CheckCircle2, HelpCircle, ArrowRight, Sparkles, Star } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import MarketingLayout from '@/components/marketing/layout'

const plans = {
  monthly: { free: 0, starter: 29, growth: 99, agency: 299 },
  yearly: { free: 0, starter: 290, growth: 990, agency: 2990 },
}

const planFeatures = {
  free: [
    '1 Workspace',
    '3 Social Profiles',
    '10 Scheduled Posts',
    'Basic Calendar',
    'Community Support',
  ],
  starter: [
    '1 Workspace',
    '10 Social Profiles',
    'Unlimited Posts',
    'Basic Analytics',
    'AI Suggestions (Limited)',
    'Email Support',
  ],
  growth: [
    'Everything in Starter',
    '3 Users included',
    '30 Social Profiles',
    'Approval Workflows',
    'Full AI Assistant',
    'Advanced Analytics',
    'Priority Support',
  ],
  agency: [
    'Everything in Growth',
    '5 Workspaces included',
    '10 Users included',
    'White-label Reports',
    'Client Portal Access',
    'Dedicated Account Manager',
    'Custom Integrations',
  ],
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(true)
  const [workspaces, setWorkspaces] = useState(1)
  const [seats, setSeats] = useState(3)

  const price = yearly ? plans.yearly : plans.monthly
  const period = yearly ? 'yr' : 'mo'
  const discount = yearly ? ' (Save 17%)' : ''

  // Calculator Logic
  const calculateCost = (basePrice: number, includedSeats: number, includedWorkspaces: number) => {
    const extraSeats = Math.max(0, seats - includedSeats)
    const extraWorkspaces = Math.max(0, workspaces - includedWorkspaces)
    const seatPrice = yearly ? 10 * 12 : 15
    const workspacePrice = yearly ? 39 * 12 : 59
    return basePrice + (extraSeats * seatPrice) + (extraWorkspaces * workspacePrice)
  }

  const growthCost = calculateCost(price.growth, 3, 1)
  const agencyCost = calculateCost(price.agency, 10, 5)

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative pt-12 sm:pt-16 lg:pt-24 pb-32 lg:pb-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900 via-secondary-900 to-black" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-[120px] opacity-20 animate-pulse" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white">No hidden fees</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
            Simple,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              transparent
            </span>{' '}
            pricing
          </h1>
          <p className="text-lg sm:text-xl text-secondary-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Start for free, upgrade as you grow. No surprise contracts or &quot;contact us&quot; for basic details.
          </p>

          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <span className={`text-sm sm:text-base font-medium transition-colors ${!yearly ? 'text-white' : 'text-secondary-400'}`}>
              Monthly
            </span>
            <Switch
              checked={yearly}
              onCheckedChange={setYearly}
              className="data-[state=checked]:bg-blue-500 scale-125"
              aria-label="Toggle yearly pricing"
            />
            <span className={`text-sm sm:text-base font-medium transition-colors ${yearly ? 'text-white' : 'text-secondary-400'}`}>
              Yearly
              <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                Save 17%
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative z-20 -mt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:gap-8 sm:grid-cols-2 lg:grid-cols-4 items-stretch">

            {/* Free Plan */}
            <Card className="bg-white shadow-xl border-secondary-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl sm:text-2xl font-bold">Free</CardTitle>
                <CardDescription className="text-sm">For individuals just starting out</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl sm:text-5xl font-bold text-secondary-900">$0</span>
                  <span className="text-base font-normal text-secondary-500">/{period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-grow pt-4">
                <ul className="space-y-3">
                  {planFeatures.free.map((feature, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-secondary-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-4">
                <Link href="/auth/signup" className="w-full">
                  <Button variant="outline" className="w-full h-12 rounded-xl text-base font-semibold border-secondary-300 hover:bg-secondary-50">
                    Get Started
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Starter Plan */}
            <Card className="bg-white shadow-xl border-secondary-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl sm:text-2xl font-bold">Starter</CardTitle>
                <CardDescription className="text-sm">For solopreneurs and creators</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl sm:text-5xl font-bold text-secondary-900">${price.starter}</span>
                  <span className="text-base font-normal text-secondary-500">/{period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-grow pt-4">
                <ul className="space-y-3">
                  {planFeatures.starter.map((feature, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-secondary-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-4">
                <Link href="/auth/signup" className="w-full">
                  <Button variant="outline" className="w-full h-12 rounded-xl text-base font-semibold border-secondary-300 hover:bg-secondary-50">
                    Start Trial
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Growth Plan - Highlighted */}
            <Card className="bg-white shadow-2xl border-2 border-blue-500 relative lg:scale-105 z-10 flex flex-col overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-500" />
              <div className="absolute -top-px -right-px bg-gradient-to-l from-blue-600 to-cyan-600 text-white text-xs font-bold px-4 py-2 rounded-bl-xl shadow-md uppercase tracking-wide flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" /> Most Popular
              </div>
              <CardHeader className="pt-10 pb-2">
                <CardTitle className="text-xl sm:text-2xl font-bold text-blue-700">Growth</CardTitle>
                <CardDescription className="text-sm">For growing teams and brands</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl sm:text-5xl font-bold text-secondary-900">${price.growth}</span>
                  <span className="text-base font-normal text-secondary-500">/{period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-grow pt-4">
                <ul className="space-y-3">
                  {planFeatures.growth.map((feature, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                      <span className="text-secondary-700 font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-4">
                <Link href="/auth/signup" className="w-full">
                  <Button
                    size="lg"
                    className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Agency Plan */}
            <Card className="bg-white shadow-xl border-secondary-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl sm:text-2xl font-bold">Agency</CardTitle>
                <CardDescription className="text-sm">For agencies with multiple clients</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl sm:text-5xl font-bold text-secondary-900">${price.agency}</span>
                  <span className="text-base font-normal text-secondary-500">/{period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-grow pt-4">
                <ul className="space-y-3">
                  {planFeatures.agency.map((feature, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-secondary-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-4">
                <Link href="/auth/signup" className="w-full">
                  <Button variant="outline" className="w-full h-12 rounded-xl text-base font-semibold border-secondary-300 hover:bg-secondary-50">
                    Start Trial
                  </Button>
                </Link>
              </CardFooter>
            </Card>

          </div>
        </div>
      </section>

      {/* Cost Calculator */}
      <section className="py-16 sm:py-20 lg:py-24 bg-secondary-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 border border-secondary-200 shadow-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-secondary-900">Estimate your total cost</h2>
                <p className="text-secondary-500 text-sm">Adjust sliders to see your estimated price</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              <div className="space-y-10">
                <div>
                  <div className="flex justify-between mb-4">
                    <label className="text-base font-semibold text-secondary-700">Total Users</label>
                    <span className="text-base font-bold text-blue-600">{seats} Users</span>
                  </div>
                  <Slider
                    aria-label="Seats"
                    value={[seats]}
                    max={50}
                    min={1}
                    step={1}
                    onValueChange={(value) => setSeats(value[0])}
                    className="py-4"
                  />
                  <p className="text-sm text-secondary-500 mt-2">Team members, collaborators, and approvers</p>
                </div>
                <div>
                  <div className="flex justify-between mb-4">
                    <label className="text-base font-semibold text-secondary-700">Total Workspaces</label>
                    <span className="text-base font-bold text-blue-600">{workspaces} Workspaces</span>
                  </div>
                  <Slider
                    aria-label="Workspaces"
                    value={[workspaces]}
                    max={20}
                    min={1}
                    step={1}
                    onValueChange={(value) => setWorkspaces(value[0])}
                    className="py-4"
                  />
                  <p className="text-sm text-secondary-500 mt-2">Separate brands, clients, or projects</p>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold text-blue-900 text-lg">Recommended Plan</p>
                        <p className="text-blue-700 font-bold text-xl">
                          {workspaces > 3 || seats > 5 ? 'Agency' : 'Growth'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl sm:text-4xl font-bold text-blue-900">
                          ${workspaces > 3 || seats > 5 ? agencyCost.toLocaleString() : growthCost.toLocaleString()}
                        </p>
                        <p className="text-sm text-blue-600">per {yearly ? 'year' : 'month'}</p>
                      </div>
                    </div>
                    <Link href="/auth/signup" className="block">
                      <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700">
                        Start Free Trial
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
                <p className="text-xs text-center text-secondary-500 mt-4">
                  *Estimated price based on standard add-on rates. Contact sales for volume discounts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-secondary-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-secondary-600">Everything you need to know about pricing</p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="q1" className="border border-secondary-200 rounded-xl px-6">
              <AccordionTrigger className="text-base sm:text-lg font-medium py-5 hover:no-underline">
                What counts as a &quot;Workspace&quot;?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 pb-5">
                A workspace is a dedicated environment for a brand or client. It has its own social accounts, media library, team members, and content calendar.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2" className="border border-secondary-200 rounded-xl px-6">
              <AccordionTrigger className="text-base sm:text-lg font-medium py-5 hover:no-underline">
                Can I change plans anytime?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 pb-5">
                Yes, you can upgrade, downgrade, or cancel at any time. Changes take effect immediately with prorated billing.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3" className="border border-secondary-200 rounded-xl px-6">
              <AccordionTrigger className="text-base sm:text-lg font-medium py-5 hover:no-underline">
                Do you offer non-profit discounts?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 pb-5">
                Yes! We offer a 50% discount for registered non-profits. Contact our support team with your documentation to apply.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4" className="border border-secondary-200 rounded-xl px-6">
              <AccordionTrigger className="text-base sm:text-lg font-medium py-5 hover:no-underline">
                Is there a free trial?
              </AccordionTrigger>
              <AccordionContent className="text-secondary-600 pb-5">
                Yes! All paid plans come with a 14-day free trial. No credit card required to start.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <FaqSchema items={[
            { question: 'What counts as a "Workspace"?', answer: 'A workspace is a dedicated environment for a brand or client. It has its own social accounts, media library, and team members.' },
            { question: 'Can I change plans anytime?', answer: 'Yes, you can upgrade, downgrade, or cancel at any time. Changes are prorated immediately.' },
            { question: 'Do you offer non-profit discounts?', answer: 'Yes! We offer a 50% discount for registered non-profits. Contact our support team with your documentation.' },
            { question: 'Is there a free trial?', answer: 'Yes! All paid plans come with a 14-day free trial. No credit card required to start.' }
          ]} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-secondary-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-secondary-900 mb-4">Still have questions?</h2>
          <p className="text-secondary-600 mb-8">Our team is here to help you find the right plan.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/support">
              <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full px-8">
                Visit Help Center
              </Button>
            </Link>
            <Link href="mailto:sales@xocial.com">
              <Button size="lg" className="w-full sm:w-auto rounded-full px-8">
                Contact Sales
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
