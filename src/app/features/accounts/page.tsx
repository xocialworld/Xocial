'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function FeatureAccounts() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 mx-auto">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Multi-Account Management</span>
          </div>
          <h1 className="mt-6 text-5xl sm:text-6xl font-bold text-secondary-900">Manage All Your Profiles In One Place</h1>
          <p className="mt-4 text-xl text-secondary-600 max-w-2xl mx-auto">OAuth connections, post lists, inline comment replies, and filters.</p>
          <Link href="/auth/signup" className="mt-8 inline-block">
            <Button size="lg" className="px-8">Get Started</Button>
          </Link>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">OAuth Integrations</h3><p className="mt-2 text-secondary-600">Secure token storage and refresh handled server-side.</p></CardContent></Card>
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">Post & Comments</h3><p className="mt-2 text-secondary-600">View recent posts and reply inline.</p></CardContent></Card>
          <Card className="border-2"><CardContent className="p-6"><h3 className="text-xl font-semibold text-secondary-900">RBAC & Filters</h3><p className="mt-2 text-secondary-600">Role-based visibility and platform/status filters.</p></CardContent></Card>
        </div>
      </section>
    </div>
  );
}