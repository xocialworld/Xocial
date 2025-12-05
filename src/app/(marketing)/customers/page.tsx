export const metadata = { title: 'Customers – Xocial', description: 'Stories from teams using Xocial' }

import { Card, CardContent } from '@/components/ui/card'

export default function CustomersPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-secondary-900 mb-8">Customers</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1,2,3].map((i) => (
          <Card key={i} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">Case Study {i}</h3>
              <p className="text-secondary-700">Coming soon: measurable outcomes and workflow improvements.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

