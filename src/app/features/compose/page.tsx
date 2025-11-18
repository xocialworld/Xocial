'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PencilLine } from 'lucide-react';

export default function FeatureCompose() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 mx-auto">
            <PencilLine className="h-4 w-4" />
            <span className="text-sm font-medium">Compose</span>
          </div>
          <h1 className="mt-6 text-5xl sm:text-6xl font-bold text-secondary-900">Compose Posts With Precision</h1>
          <p className="mt-4 text-xl text-secondary-600 max-w-2xl mx-auto">Platform previews, media uploads, scheduling, and template application.</p>
          <Link href="/auth/signup" className="mt-8 inline-block"><Button size="lg" className="px-8">Start Free Trial</Button></Link>
        </motion.div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">Platform Previews</h3><p className="mt-2 text-secondary-600">Preview how posts will look per platform before you publish.</p></CardContent></Card>
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">Media Uploader</h3><p className="mt-2 text-secondary-600">Upload media and reuse assets from the library.</p></CardContent></Card>
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">Schedule & Templates</h3><p className="mt-2 text-secondary-600">Pick date/time and apply templates in one workflow.</p></CardContent></Card>
        </div>
      </section>
    </div>
  );
}