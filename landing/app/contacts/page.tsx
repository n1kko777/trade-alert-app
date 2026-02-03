import type { Metadata } from 'next'
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Контакты',
  description: `Свяжитесь с командой ${SITE_NAME}. Техническая поддержка, вопросы и предложения.`,
}

export default function ContactsPage() {
  return (
    <div className="py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-4">
            Контакты
          </h1>
          <p className="text-text-secondary text-lg">
            Мы всегда рады помочь и ответить на ваши вопросы
          </p>
        </div>

        <div className="grid gap-6">
          {/* Email */}
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📧</span>
              </div>
              <div>
                <h2 className="font-heading font-semibold text-text-primary mb-2">
                  Email
                </h2>
                <p className="text-text-secondary mb-3">
                  Основной канал связи для вопросов и поддержки
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-accent hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>

          {/* Response time */}
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⏱️</span>
              </div>
              <div>
                <h2 className="font-heading font-semibold text-text-primary mb-2">
                  Время ответа
                </h2>
                <p className="text-text-secondary">
                  Мы стараемся отвечать на все обращения в течение 24 часов в рабочие дни.
                  VIP-пользователи получают приоритетную поддержку.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">❓</span>
              </div>
              <div>
                <h2 className="font-heading font-semibold text-text-primary mb-2">
                  Часто задаваемые вопросы
                </h2>
                <p className="text-text-secondary mb-3">
                  Возможно, ответ на ваш вопрос уже есть в нашем FAQ
                </p>
                <a
                  href="/faq"
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  Перейти в FAQ
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bug reports */}
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🐛</span>
              </div>
              <div>
                <h2 className="font-heading font-semibold text-text-primary mb-2">
                  Сообщить об ошибке
                </h2>
                <p className="text-text-secondary">
                  Нашли баг? Напишите нам на{' '}
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=Bug Report`}
                    className="text-accent hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  {' '}с темой «Bug Report» и подробным описанием проблемы.
                </p>
              </div>
            </div>
          </div>

          {/* Feature requests */}
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💡</span>
              </div>
              <div>
                <h2 className="font-heading font-semibold text-text-primary mb-2">
                  Предложить идею
                </h2>
                <p className="text-text-secondary">
                  Есть идея для улучшения? Мы всегда открыты к предложениям!
                  Пишите на{' '}
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=Feature Request`}
                    className="text-accent hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
