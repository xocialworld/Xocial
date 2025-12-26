'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Calculator, ArrowLeft, Download } from 'lucide-react'
import Link from 'next/link'

export default function ROICalculatorPage() {
    // Calculator State
    const [teamSize, setTeamSize] = useState(5)
    const [hourlyRate, setHourlyRate] = useState(50)
    const [hoursPerWeek, setHoursPerWeek] = useState(10) // Hours spent manually managing socials

    // Xocial typically saves 60% of time
    const savingsPercent = 0.60

    // Calculations
    const weeklyCost = teamSize * hourlyRate * hoursPerWeek
    const monthlyCost = weeklyCost * 4
    const yearlyCost = monthlyCost * 12

    const savedHoursPerWeek = hoursPerWeek * savingsPercent
    const savedMoneyPerYear = yearlyCost * savingsPercent
    const newExposure = 3 // Multiplier for engagement/reach with Xocial

    return (
        <div className="pb-20">
            <div className="bg-secondary-50 pt-24 pb-20 px-4 sm:px-6 lg:px-8 text-center">
                <Link href="/resources" className="inline-flex items-center text-sm font-medium text-secondary-500 hover:text-secondary-900 mb-6">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Resources
                </Link>
                <h1 className="text-4xl sm:text-5xl font-bold text-secondary-900 mb-6">Social Media ROI Calculator</h1>
                <p className="text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
                    See exactly how much money you could save by switching to Xocial&apos;s automated workflow.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
                <div className="grid lg:grid-cols-2 gap-8">

                    {/* Inputs */}
                    <Card className="shadow-xl">
                        <CardHeader>
                            <CardTitle>Your Current Workflow</CardTitle>
                            <CardDescription>Enter your team&apos;s details below.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div>
                                <div className="flex justify-between mb-4">
                                    <label className="font-semibold text-secondary-900">Total Team Members</label>
                                    <span className="font-bold text-blue-600">{teamSize} people</span>
                                </div>
                                <Slider value={[teamSize]} min={1} max={50} step={1} onValueChange={(v) => setTeamSize(v[0])} className="mb-2" />
                                <p className="text-sm text-secondary-500">Number of people involved in content creation and approval.</p>
                            </div>

                            <div>
                                <div className="flex justify-between mb-4">
                                    <label className="font-semibold text-secondary-900">Avg. Hourly Rate ($)</label>
                                    <span className="font-bold text-blue-600">${hourlyRate}/hr</span>
                                </div>
                                <Slider value={[hourlyRate]} min={15} max={200} step={5} onValueChange={(v) => setHourlyRate(v[0])} className="mb-2" />
                                <p className="text-sm text-secondary-500">Average blended hourly cost of your team.</p>
                            </div>

                            <div>
                                <div className="flex justify-between mb-4">
                                    <label className="font-semibold text-secondary-900">Manual Hours / Week (Per Person)</label>
                                    <span className="font-bold text-blue-600">{hoursPerWeek} hrs</span>
                                </div>
                                <Slider value={[hoursPerWeek]} min={1} max={40} step={1} onValueChange={(v) => setHoursPerWeek(v[0])} className="mb-2" />
                                <p className="text-sm text-secondary-500">Time spent posting, scheduling, and emailing back-and-forth.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Results */}
                    <Card className="shadow-xl bg-secondary-900 text-white border-secondary-800">
                        <CardHeader>
                            <CardTitle className="text-white">Your Potential Savings</CardTitle>
                            <CardDescription className="text-secondary-400">Based on Xocial&apos;s 60% efficiency improvement.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-secondary-800/50 p-4 rounded-xl border border-secondary-700">
                                    <p className="text-secondary-400 text-sm mb-1">Weekly Time Saved</p>
                                    <p className="text-3xl font-bold text-green-400">{(savedHoursPerWeek * teamSize).toLocaleString()} hrs</p>
                                </div>
                                <div className="bg-secondary-800/50 p-4 rounded-xl border border-secondary-700">
                                    <p className="text-secondary-400 text-sm mb-1">Yearly Cost Saved</p>
                                    <p className="text-3xl font-bold text-green-400">${savedMoneyPerYear.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                                <p className="font-bold text-white mb-2">The &quot;Hidden&quot; Cost of Manual Work</p>
                                <p className="text-blue-100 text-sm mb-4">
                                    You are currently spending <span className="font-bold text-white">${yearlyCost.toLocaleString()}</span> per year just on manual social media admin tasks.
                                </p>
                                <p className="text-blue-100 text-sm">
                                    Switching to Xocial pays for itself in less than a month.
                                </p>
                            </div>

                            <Button size="lg" className="w-full bg-white text-secondary-900 hover:bg-secondary-100 font-bold gap-2">
                                <Download className="h-4 w-4" /> Download Full Report
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
