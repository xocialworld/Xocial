import Script from 'next/script'

type QA = { question: string; answer: string }

export default function FaqSchema({ items }: { items: QA[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  }
  return <Script type="application/ld+json" id="faq-schema" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

