'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FAQ_ITEMS } from '@/lib/constants'

interface FAQProps {
  limit?: number
  showViewAll?: boolean
}

export default function FAQ({ limit, showViewAll = true }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const items = limit ? FAQ_ITEMS.slice(0, limit) : FAQ_ITEMS

  return (
    <section id="faq" className="py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-4">
            Часто задаваемые вопросы
          </h2>
          <p className="text-text-secondary text-lg">
            Ответы на популярные вопросы о приложении
          </p>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="card cursor-pointer"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-heading font-semibold text-text-primary">
                  {item.question}
                </h3>
                <span
                  className={`text-accent transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                >
                  ▼
                </span>
              </div>

              {openIndex === index && (
                <p className="mt-4 text-text-secondary">
                  {item.answer}
                </p>
              )}
            </div>
          ))}
        </div>

        {showViewAll && limit && (
          <div className="text-center mt-8">
            <Link
              href="/faq"
              className="text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1"
            >
              Все вопросы
              <span>→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
