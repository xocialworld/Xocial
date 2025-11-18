'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export default function FeatureContentCalendar() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 mx-auto">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Content Calendar</span>
          </div>
          <h1 className="mt-6 text-5xl sm:text-6xl font-bold text-secondary-900">Plan And Schedule With Confidence</h1>
          <p className="mt-4 text-xl text-secondary-600 max-w-2xl mx-auto">Month view, platform filters, day details, and quick rescheduling with undo.</p>
          <Link href="/auth/signup" className="mt-8 inline-block">
            <Button size="lg" className="px-8">Start Free Trial</Button>
          </Link>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">Month & Year Navigation</h3><p className="mt-2 text-secondary-600">Navigate easily with clear controls and responsive layouts.</p></CardContent></Card>
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">Platform Indicators</h3><p className="mt-2 text-secondary-600">See platform-specific markers and counts per day.</p></CardContent></Card>
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">Day Detail Panel</h3><p className="mt-2 text-secondary-600">Inspect and edit scheduled posts with inline actions.</p></CardContent></Card>
        </div>
      </section>
    </div>
  );
}