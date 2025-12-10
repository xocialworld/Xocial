import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import OptimizedImage from '@/components/ui/optimized-image'
import { CalendarDays, ArrowRight, User } from 'lucide-react'

const posts = [
  {
    title: "The Ultimate Guide to Social Media Approvals",
    excerpt: "Stop the endless email threads. Learn how to set up streamlined approval workflows that keep clients happy and your team sane.",
    category: "Workflow",
    author: "Sarah Johnson",
    date: "Dec 12, 2024",
    image: "/landing/feature-approve.png",
    slug: "social-media-approval-guide"
  },
  {
    title: "10 Metrics That Actually Matter (And 5 That Don't)",
    excerpt: "Vanity metrics are out. ROI is in. We break down the analytics you should actually be tracking to prove value to your clients.",
    category: "Analytics",
    author: "Mike Chen",
    date: "Dec 10, 2024",
    image: "/landing/feature-analytics.png",
    slug: "metrics-that-matter"
  },
  {
    title: "How to Scale Your Agency to 50+ Clients",
    excerpt: "Scaling is hard. Here are the systems, tools, and processes we used to grow from a boutique shop to a national agency.",
    category: "Agency Growth",
    author: "Alex Rivera",
    date: "Dec 05, 2024",
    image: "/landing/hero-dashboard.png",
    slug: "scale-your-agency"
  },
  {
    title: "Collaborative Content Creation in 2025",
    excerpt: "The future of content is collaborative. Explore how AI and real-time tools are changing the way teams create together.",
    category: "Trends",
    author: "Sarah Johnson",
    date: "Nov 28, 2024",
    image: "/landing/feature-collaborate.png",
    slug: "collaborative-content-2025"
  },
  {
    title: "Mastering the Art of Content Scheduling",
    excerpt: "Timing is everything. Discover the best times to post for every industry and how to automate your calendar for maximum reach.",
    category: "Strategy",
    author: "David Kim",
    date: "Nov 20, 2024",
    image: "/landing/feature-schedule.png",
    slug: "content-scheduling-mastery"
  },
  {
    title: "Why Multi-Location Management is a Nightmare (And How to Fix It)",
    excerpt: "Managing 100s of local pages? Don't lose your mind. Here's a blueprint for centralized control with local relevance.",
    category: "Enterprise",
    author: "Alex Rivera",
    date: "Nov 15, 2024",
    image: "/landing/solution-multi.png",
    slug: "multi-location-management-fix"
  }
]

export const metadata = { title: 'Blog – Xocial', description: 'Insights, guides, and updates' }

export default function BlogPage() {
  return (
    <div className="pb-20">
      <div className="bg-secondary-900 text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8 text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-secondary-900 to-black relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="relative z-10">
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 tracking-tight">Xocial <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Insights</span></h1>
          <p className="text-xl text-secondary-300 mb-8 max-w-2xl mx-auto">
            Expert advice on agency growth, social strategy, and workflow optimization.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <Link key={i} href="#" className="group">
              <Card className="h-full border-secondary-200 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="aspect-video relative overflow-hidden">
                  <div className="absolute inset-0 bg-secondary-900/10 group-hover:bg-transparent transition-colors z-10" />
                  <OptimizedImage
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <Badge className="absolute top-4 left-4 z-20 bg-white/90 text-secondary-900 hover:bg-white backdrop-blur-sm">
                    {post.category}
                  </Badge>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 text-xs text-secondary-500 mb-3 font-medium">
                    <div className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {post.date}</div>
                    <div className="flex items-center gap-1"><User className="h-3 w-3" /> {post.author}</div>
                  </div>
                  <h3 className="text-xl font-bold text-secondary-900 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-secondary-600 mb-4 line-clamp-3 text-sm leading-relaxed">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center text-indigo-600 font-semibold text-sm group-hover:underline">
                    Read Article <ArrowRight className="ml-1 h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Button size="lg" variant="outline" className="rounded-full px-8 border-secondary-300 hover:bg-secondary-50">View All Architecture</Button>
        </div>
      </div>
    </div>
  )
}
