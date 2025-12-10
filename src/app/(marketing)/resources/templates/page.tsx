'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, FileSpreadsheet, FileText, Download, CheckCircle2 } from 'lucide-react'

const templates = [
    {
        title: "2024 Social Content Calendar",
        type: "Google Sheets",
        icon: FileSpreadsheet,
        features: ["Daily/Weekly View", "Platform-specific tabs", "Hashtag database"],
        color: "text-green-600 bg-green-100"
    },
    {
        title: "Client Onboarding Checklist",
        type: "PDF / Notion",
        icon: FileText,
        features: ["Asset collection form", "Access request email templates", "Zero-day strategy"],
        color: "text-blue-600 bg-blue-100"
    },
    {
        title: "Monthly Reporting Template",
        type: "Google Slides",
        icon: FileSpreadsheet,
        features: ["Key KPI dashboard", "Top performing posts", "Strategy recommendations"],
        color: "text-amber-600 bg-amber-100"
    }
]

export default function TemplatesPage() {
    return (
        <div className="pb-20">
            <div className="bg-secondary-50 pt-24 pb-20 px-4 sm:px-6 lg:px-8 text-center">
                <Link href="/resources" className="inline-flex items-center text-sm font-medium text-secondary-500 hover:text-secondary-900 mb-6">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Resources
                </Link>
                <h1 className="text-4xl sm:text-5xl font-bold text-secondary-900 mb-6">Free Templates</h1>
                <p className="text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
                    Save hours of setup time with our battle-tested agency templates.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
                <div className="grid gap-8 md:grid-cols-3">
                    {templates.map((t, i) => (
                        <Card key={i} className="shadow-lg hover:-translate-y-1 transition-transform duration-300">
                            <CardHeader>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${t.color}`}>
                                    <t.icon className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-xl">{t.title}</CardTitle>
                                <CardDescription>{t.type}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 mb-6">
                                    {t.features.map((f, j) => (
                                        <li key={j} className="flex items-start gap-2 text-sm text-secondary-600">
                                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full gap-2" variant="outline">
                                    <Download className="h-4 w-4" /> Download Now
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>

        </div>
    )
}
