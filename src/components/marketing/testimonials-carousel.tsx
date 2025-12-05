'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

type Testimonial = { name: string; role: string; initials: string; quote: string }

const testimonials: Testimonial[] = [
  { name: 'Anika K.', role: 'Social Media Lead', initials: 'AK', quote: 'Our team schedules faster and our engagement is up 30%.' },
  { name: 'Jordan S.', role: 'Founder', initials: 'JS', quote: 'AI suggestions save us hours each week.' },
  { name: 'Ravi M.', role: 'Agency Manager', initials: 'RM', quote: 'One platform that finally unifies our workflow.' },
]

export default function TestimonialsCarousel() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % testimonials.length), 5000)
    return () => clearInterval(id)
  }, [])

  const t = testimonials[index]
  return (
    <div aria-roledescription="carousel" aria-label="Testimonials" className="max-w-xl mx-auto">
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Avatar><AvatarFallback>{t.initials}</AvatarFallback></Avatar>
            <div>
              <p className="font-medium text-secondary-900">{t.name}</p>
              <p className="text-sm text-secondary-500">{t.role}</p>
            </div>
          </div>
          <p className="mt-4 text-secondary-700">{t.quote}</p>
          <div className="mt-4 flex gap-2 justify-center" role="group" aria-label="Carousel controls">
            {testimonials.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? 'true' : 'false'}
                onClick={() => setIndex(i)}
                className={`h-2 w-2 rounded-full ${i === index ? 'bg-primary-600' : 'bg-secondary-300'}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

