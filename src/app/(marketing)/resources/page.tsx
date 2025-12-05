export const metadata = { title: 'Resources – Xocial', description: 'Guides, templates, calculators, and quizzes' }

import Link from 'next/link'

export default function ResourcesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-secondary-900 mb-8">Resources</h1>
      <ul className="list-disc pl-6 space-y-2 text-secondary-800">
        <li><Link href="/resources/guides" className="underline">Guides</Link></li>
        <li><Link href="/resources/templates" className="underline">Templates</Link></li>
        <li><Link href="/resources/calculators" className="underline">Calculators</Link></li>
        <li><Link href="/resources/quizzes" className="underline">Quizzes</Link></li>
      </ul>
    </div>
  )
}

