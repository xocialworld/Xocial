'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { TwitterPreview } from '@/components/features/compose/previews/twitter-preview';
import { InstagramPreview } from '@/components/features/compose/previews/instagram-preview';

export default function FeatureAIAssistant() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 mx-auto">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI Content Assistant</span>
          </div>
          <h1 className="mt-6 text-5xl sm:text-6xl font-bold text-secondary-900">Create On-Brand Content With AI</h1>
          <p className="mt-4 text-xl text-secondary-600 max-w-2xl mx-auto">Structured prompts, platform variants, hashtags, and strategy notes powered by a unified AI Gateway.</p>
          <Link href="/auth/signup" className="mt-8 inline-block">
            <Button size="lg" className="px-8">Start Free Trial</Button>
          </Link>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
            <Card className="border-2">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-secondary-900">Platform Variants</h3>
                <p className="mt-2 text-secondary-600">Generate tailored captions for Twitter, Instagram, LinkedIn, and more with tone and audience controls.</p>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-secondary-900">Hashtags & Strategy</h3>
                <p className="mt-2 text-secondary-600">Get relevant hashtags and strategy notes that support your campaign goals.</p>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-secondary-900">Send to Calendar</h3>
                <p className="mt-2 text-secondary-600">Save drafts and schedule directly into the content calendar.</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TwitterPreview content="Scheduling posts across platforms just got easier. Meet XOCIAL — the AI-powered command center." mediaItems={[]} />
            <InstagramPreview content="Behind the scenes: how we plan content for maximum engagement ✨" mediaItems={[]} />
          </motion.div>
        </div>
      </section>
    </div>
  );
}