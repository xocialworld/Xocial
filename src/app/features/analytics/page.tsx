'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function FeatureAnalytics() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 mx-auto">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Analytics Dashboards</span>
          </div>
          <h1 className="mt-6 text-5xl sm:text-6xl font-bold text-secondary-900">Insights That Drive Action</h1>
          <p className="mt-4 text-xl text-secondary-600 max-w-2xl mx-auto">KPIs, time-series, top posts, platform share, and AI insight summaries.</p>
          <Link href="/auth/signup" className="mt-8 inline-block">
            <Button size="lg" className="px-8">Start Free Trial</Button>
          </Link>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">KPI Overview</h3><p className="mt-2 text-secondary-600">Reach, engagement rate, follower growth, and frequency.</p></CardContent></Card>
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">Charts & Rankings</h3><p className="mt-2 text-secondary-600">Engagement over time and top-performing content.</p></CardContent></Card>
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">AI Insights</h3><p className="mt-2 text-secondary-600">Summaries and recommendations for next week’s plan.</p></CardContent></Card>
        </div>
      </section>
    </div>
  );
}