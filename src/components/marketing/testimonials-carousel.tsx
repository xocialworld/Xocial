'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react'

type Testimonial = {
  name: string
  role: string
  company: string
  initials: string
  quote: string
  avatar?: string
  rating: number
}

const testimonials: Testimonial[] = [
  {
    name: 'Anika Kumar',
    role: 'Social Media Lead',
    company: 'TechFlow Inc',
    initials: 'AK',
    quote: "Our team schedules content 3x faster and our engagement is up 30%. The AI suggestions are surprisingly on-brand every time.",
    rating: 5
  },
  {
    name: 'Jordan Smith',
    role: 'Founder & CEO',
    company: 'Growth Labs',
    initials: 'JS',
    quote: "The AI caption writer alone saves me 5 hours a week. This is the tool I've been looking for since I started my agency.",
    rating: 5
  },
  {
    name: 'Ravi Menon',
    role: 'Agency Director',
    company: 'Creative Pulse',
    initials: 'RM',
    quote: "Finally, one platform that unifies our entire workflow. Client approvals that used to take days now happen in hours.",
    rating: 5
  },
  {
    name: 'Sarah Chen',
    role: 'Marketing Manager',
    company: 'BoldBrand Co',
    initials: 'SC',
    quote: "The visual calendar is a game-changer. I can see our entire month at a glance and spot content gaps instantly.",
    rating: 5
  },
  {
    name: 'Marcus Williams',
    role: 'Content Strategist',
    company: 'Elevate Media',
    initials: 'MW',
    quote: "Best-in-class analytics. I finally understand what's working and can prove ROI to my clients with beautiful reports.",
    rating: 5
  },
]

export default function TestimonialsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const handlePrev = () => {
    setIsAutoPlaying(false)
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const handleNext = () => {
    setIsAutoPlaying(false)
    setActiveIndex((prev) => (prev + 1) % testimonials.length)
  }

  const handleDotClick = (index: number) => {
    setIsAutoPlaying(false)
    setActiveIndex(index)
  }

  return (
    <div
      aria-roledescription="carousel"
      aria-label="Customer testimonials"
      className="w-full max-w-4xl mx-auto"
    >
      <div className="relative">
        {/* Navigation Buttons */}
        <button
          onClick={handlePrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-12 z-10 h-12 w-12 rounded-full bg-white shadow-lg border border-secondary-200 flex items-center justify-center text-secondary-600 hover:text-secondary-900 hover:shadow-xl transition-all duration-300 hidden sm:flex"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-12 z-10 h-12 w-12 rounded-full bg-white shadow-lg border border-secondary-200 flex items-center justify-center text-secondary-600 hover:text-secondary-900 hover:shadow-xl transition-all duration-300 hidden sm:flex"
          aria-label="Next testimonial"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Testimonial Cards */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="w-full flex-shrink-0 px-4"
                aria-hidden={index !== activeIndex}
              >
                <Card className="bg-white shadow-xl border-secondary-100 overflow-hidden">
                  <CardContent className="p-8 sm:p-10 lg:p-12 relative">
                    {/* Quote Icon */}
                    <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
                      <Quote className="h-12 w-12 sm:h-16 sm:w-16 text-primary-100" />
                    </div>

                    {/* Rating Stars */}
                    <div className="flex gap-1 mb-6">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>

                    {/* Quote Text */}
                    <blockquote className="text-xl sm:text-2xl lg:text-3xl font-medium text-secondary-800 leading-relaxed mb-8 relative z-10">
                      &quot;{testimonial.quote}&quot;
                    </blockquote>

                    {/* Author Info */}
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-4 ring-primary-100">
                        {testimonial.avatar ? (
                          <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-br from-primary-500 to-indigo-600 text-white text-lg font-bold">
                          {testimonial.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-lg text-secondary-900">{testimonial.name}</p>
                        <p className="text-secondary-600">
                          {testimonial.role}{' '}
                          <span className="text-secondary-400">at</span>{' '}
                          <span className="font-medium text-secondary-700">{testimonial.company}</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Dots Navigation */}
        <div className="mt-8 flex gap-3 justify-center" role="group" aria-label="Testimonial navigation">
          {testimonials.map((_, index) => (
            <button
              key={index}
              aria-label={`Go to testimonial ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : 'false'}
              onClick={() => handleDotClick(index)}
              className={`h-3 rounded-full transition-all duration-300 ${index === activeIndex
                ? 'w-8 bg-primary-600'
                : 'w-3 bg-secondary-300 hover:bg-secondary-400'
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
