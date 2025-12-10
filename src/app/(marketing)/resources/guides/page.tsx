'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Clock, Download } from 'lucide-react'

const guides = [
    {
        title: "The Ultimate Agency Scaling Guide",
        description: "Learn the secrets of scaling from 10 to 100 clients without breaking your team. Covers processes, hiring, and pricing.",
        readTime: "15 min read",
        tag: "Agency Growth",
        color: "bg-blue-100 text-blue-700"
    },
    {
        title: "Brand Voice & Governance 101",
        description: "How to maintain a consistent brand voice across 50+ locations. A must-read for franchise marketers.",
        readTime: "10 min read",
        tag: "Branding",
        color: "bg-purple-100 text-purple-700"
    },
    {
        title: "Crisis Management Playbook",
        description: "What to do when things go wrong on social media. Templates, workflows, and response strategies.",
        readTime: "20 min read",
        tag: "Strategy",
        color: "bg-red-100 text-red-700"
    },
    {
        title: "Social Media Approval Workflows",
        description: "Stop using email for approvals. Implementing a proper tiered approval system for clients and stakeholders.",
        readTime: "8 min read",
        tag: "Operations",
        color: "bg-green-100 text-green-700"
    }
]

export default function GuidesPage() {
    return (
        <div className="pb-20">
            <div className="bg-secondary-50 pt-24 pb-20 px-4 sm:px-6 lg:px-8 text-center">
                <Link href="/resources" className="inline-flex items-center text-sm font-medium text-secondary-500 hover:text-secondary-900 mb-6">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Resources
                </Link>
                <h1 className="text-4xl sm:text-5xl font-bold text-secondary-900 mb-6">Marketing Guides</h1>
                <p className="text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
                    Deep dives into strategy, operations, and growth for modern marketing teams.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
                <div className="grid gap-8 md:grid-cols-2">
                    {guides.map((guide, i) => (
                        <Card key={i} className="flex flex-col hover:shadow-xl transition-shadow duration-300">
                            <CardHeader>
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${guide.color}`}>{guide.tag}</span>
                                    <div className="flex items-center text-sm text-secondary-500">
                                        <Clock className="h-4 w-4 mr-1" /> {guide.readTime}
                                    </div>
                                </div>
                                <CardTitle className="text-2xl font-bold">{guide.title}</CardTitle>
                                <CardDescription className="text-base mt-2">{guide.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                {/* Placeholder for cover image if needed later */}
                                <div className="h-48 bg-secondary-100 rounded-lg flex items-center justify-center">
                                    <BookOpen className="h-12 w-12 text-secondary-300" />
                                </div>
                            </CardContent>
                            <CardFooter className="pt-6">
                                <Button className="w-full gap-2" variant="outline">
                                    <Download className="h-4 w-4" /> Download PDF
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
