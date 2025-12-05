'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { trackEngagement } from '@/lib/performance-monitoring'

export default function MarketingFooter() {
  return (
    <footer role="contentinfo" className="bg-secondary-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6" aria-hidden />
              <span className="text-xl font-bold">Xocial</span>
            </div>
            <p className="text-secondary-400 text-sm">AI-powered social media management for modern teams</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-secondary-400">
              <li><Link href="/product/create" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_product_create' })}>Create</Link></li>
              <li><Link href="/product/plan" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_product_plan' })}>Plan</Link></li>
              <li><Link href="/product/approve" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_product_approve' })}>Approve</Link></li>
              <li><Link href="/product/collaborate" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_product_collaborate' })}>Collaborate</Link></li>
              <li><Link href="/product/schedule" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_product_schedule' })}>Schedule</Link></li>
              <li><Link href="/product/analyze" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_product_analyze' })}>Analyze</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Solutions</h4>
            <ul className="space-y-2 text-sm text-secondary-400">
              <li><Link href="/solutions/brands" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_solutions_brands' })}>Brands</Link></li>
              <li><Link href="/solutions/agencies" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_solutions_agencies' })}>Agencies</Link></li>
              <li><Link href="/solutions/multi-location" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_solutions_multi' })}>Multi-location</Link></li>
              <li><Link href="/support" className="hover:text-white" onClick={() => trackEngagement({ event: 'nav_click', label: 'footer_support' })}>Support</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-secondary-400">
              <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
              <li><span className="hover:text-white text-secondary-500">Terms (Coming Soon)</span></li>
              <li><span className="hover:text-white text-secondary-500">Security (Coming Soon)</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-secondary-800 mt-12 pt-8 text-center text-sm text-secondary-400">
          <p>© 2025 Xocial. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

