'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function FeatureMedia() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-secondary-900">Media Library</h1>
          <p className="mt-4 text-xl text-secondary-600 max-w-2xl mx-auto">Upload, organize, and analyze media for content creation and scheduling.</p>
          <Link href="/auth/signup" className="mt-8 inline-block"><Button size="lg" className="px-8">Get Started</Button></Link>
        </motion.div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">Asset Management</h3><p className="mt-2 text-secondary-600">Keep all your assets in one place with tags and filters.</p></CardContent></Card>
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">Media Analysis</h3><p className="mt-2 text-secondary-600">Leverage AI to analyze media performance and suitability.</p></CardContent></Card>
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">Calendar Integration</h3><p className="mt-2 text-secondary-600">Use assets directly in the content calendar and composer.</p></CardContent></Card>
        </div>
      </section>
    </div>
  );
}