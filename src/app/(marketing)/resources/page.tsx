'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, Calculator, FileText, ArrowRight } from 'lucide-react'

const resources = [
  {
    title: "Social Media ROI Calculator",
    description: "Prove the value of your work to your boss with this simple template.",
    icon: Calculator,
    href: "/resources/calculators",
    color: "text-blue-600",
    bg: "bg-blue-100"
  },
  {
    title: "Agency Growth Guide",
    description: "How to scale from 10 to 100 clients without adding headcount.",
    icon: BookOpen,
    href: "/resources/guides",
    color: "text-purple-600",
    bg: "bg-purple-100"
  },
  {
    title: "2024 Content Calendar",
    description: "Download our free template with key dates and hashtags.",
    icon: FileText,
    href: "/resources/templates",
    color: "text-green-600",
    bg: "bg-green-100"
  }
]

export default function ResourcesPage() {
  return (
    <div className="pb-20">
      <div className="bg-secondary-50 pt-24 pb-20 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-secondary-900 mb-6">Resource Hub</h1>
        <p className="text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
          Level up your marketing game with free guides, tools, and templates.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        <div className="grid gap-8 md:grid-cols-3">
          {resources.map((r, i) => (
            <Card key={i} className="shadow-xl hover:-translate-y-1 transition-transform duration-300">
              <CardHeader>
                <div className={`w-12 h-12 ${r.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <r.icon className={`h-6 w-6 ${r.color}`} />
                </div>
                <CardTitle className="text-xl font-bold">{r.title}</CardTitle>
                <CardDescription className="text-base">{r.description}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Link href={r.href} className={`flex items-center gap-2 font-semibold ${r.color} hover:underline`}>
                  Access Resource <ArrowRight className="h-4 w-4" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <section className="max-w-4xl mx-auto text-center py-24">
        <h2 className="text-3xl font-bold text-secondary-900 mb-6">Want more tips?</h2>
        <p className="text-secondary-600 mb-8">Join 50,000+ marketers getting our weekly newsletter.</p>
        <form className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="Enter your email"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button>Subscribe</Button>
        </form>
      </section>

    </div>
  )
}
