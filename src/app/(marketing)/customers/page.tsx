'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import OptimizedImage from '@/components/ui/optimized-image'
import { Quote, ArrowRight, TrendingUp, Users, Globe } from 'lucide-react'

// Placeholder data - in a real app this would come from a CMS
const customers = [
  {
    name: "TechFlow",
    logo: "/landing/social-proof.png",
    quote: "Xocial transformed how we handle our 50+ clients. It used to take a week to get approvals, now it takes hours.",
    author: "Sarah Jenkins, VP of Marketing",
    stat: "40% faster approvals",
    color: "bg-blue-50 border-blue-200"
  },
  {
    name: "GlobalRetail",
    logo: "/landing/social-proof.png",
    quote: "The multi-location features are a lifesaver. We publish to 200 store pages instantly while maintaining local relevance.",
    author: "Mike Chen, Digital Director",
    stat: "3x engagement growth",
    color: "bg-green-50 border-green-200"
  },
  {
    name: "CreativeStudios",
    logo: "/landing/social-proof.png",
    quote: "Finally, a tool that respects the creative process. The asset library and version control are exactly what we needed.",
    author: "Jessica Lee, Creative Lead",
    stat: "100% brand consistency",
    color: "bg-purple-50 border-purple-200"
  }
]

export default function CustomersPage() {
  return (
    <div className="pb-20">
      <div className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-secondary-900 to-black text-white pt-24 pb-32 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20"></div>

        <div className="relative z-10">
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
            Trusted by the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">best</span>
          </h1>
          <p className="text-xl text-secondary-300 mb-8 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            See how leading agencies and brands are using Xocial to scale their social impact and streamline workflows.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
        <div className="grid gap-8 md:grid-cols-3">
          {customers.map((c, i) => (
            <Card key={i} className={`shadow-xl border ${c.color} hover:-translate-y-2 transition-transform duration-300 h-full flex flex-col bg-white/95 backdrop-blur`}>
              <CardContent className="p-8 flex flex-col h-full">
                <Quote className="h-10 w-10 text-secondary-300 mb-6" />
                <p className="text-lg text-secondary-800 italic mb-8 flex-grow leading-relaxed">"{c.quote}"</p>
                <div className="border-t border-secondary-100 pt-6 mt-auto">
                  <div className="mb-2">
                    <div className="font-bold text-secondary-900 text-lg">{c.author}</div>
                    <div className="text-sm font-medium text-secondary-500">{c.name}</div>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-secondary-200 text-sm font-bold text-secondary-900 shadow-sm mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    {c.stat}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="bg-white rounded-3xl shadow-2xl border border-secondary-100 overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-10 md:p-14 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold w-fit mb-6">
                CASE STUDY
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-6 leading-tight">How TechFlow Agency Scaled 10x</h2>
              <p className="text-lg text-secondary-600 mb-8 leading-relaxed">
                TechFlow was struggling with "spreadsheet hell". Managing content calendars for 50 clients in Excel was leading to errors, missed posts, and frustrated clients.
              </p>
              <ul className="space-y-6 mb-10">
                <li className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shrink-0"><Users className="h-6 w-6" /></div>
                  <div>
                    <h4 className="font-bold text-secondary-900 text-lg mb-1">Unified Team Workflow</h4>
                    <p className="text-secondary-600">Moved 20 account managers onto a single platform.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-xl text-green-600 shrink-0"><Globe className="h-6 w-6" /></div>
                  <div>
                    <h4 className="font-bold text-secondary-900 text-lg mb-1">Client Portal Adoption</h4>
                    <p className="text-secondary-600">95% of clients now approve content directly in Xocial.</p>
                  </div>
                </li>
              </ul>
              <Button variant="outline" className="gap-2 w-fit h-12 px-6 rounded-full font-semibold border-secondary-300 hover:bg-secondary-50">Read Full Story <ArrowRight className="h-4 w-4" /></Button>
            </div>
            <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 p-10 md:p-14 flex items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200/50 rounded-full blur-[80px]"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-200/50 rounded-full blur-[80px]"></div>
              <div className="relative z-10 text-center bg-white/60 backdrop-blur-xl p-12 rounded-3xl shadow-xl border border-white/50">
                <div className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">40%</div>
                <div className="text-2xl text-secondary-700 font-bold">Faster Turnaround</div>
                <p className="text-secondary-500 mt-2">From draft to published</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-secondary-900 text-white py-20 text-center">
        <h2 className="text-3xl font-bold mb-8">Join 10,000+ happy marketers</h2>
        <div className="flex justify-center gap-4">
          <Link href="/auth/signup"><Button size="lg" className="px-8 rounded-full">Get Started Free</Button></Link>
        </div>
      </div>

    </div>
  )
}
