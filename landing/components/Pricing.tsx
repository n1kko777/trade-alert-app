import Link from 'next/link'
import { PRICING_PLANS, STORE_LINKS } from '@/lib/constants'

interface PricingProps {
  showFullDetails?: boolean
}

export default function Pricing({ showFullDetails = false }: PricingProps) {
  return (
    <section id="pricing" className="py-20 bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-4">
            Тарифы
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Выберите план, который подходит именно вам
          </p>

          {/* Trial badge */}
          <div className="inline-flex items-center gap-2 bg-success/10 border border-success/20 rounded-full px-4 py-2 mt-6">
            <span className="text-success">✨</span>
            <span className="text-sm text-success">7 дней бесплатный пробный период</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`card relative ${
                plan.isPopular
                  ? 'border-accent ring-2 ring-accent/20'
                  : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Популярный
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-heading font-bold text-text-primary mb-2">
                  {plan.name}
                </h3>
                <div className="text-2xl font-bold text-accent">
                  {plan.price}
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <span className="text-success mt-0.5">✓</span>
                    <span className="text-text-secondary">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={STORE_LINKS.appStore}
                target="_blank"
                rel="noopener noreferrer"
                className={`block text-center py-3 px-4 rounded-xl font-semibold transition-colors ${
                  plan.isPopular
                    ? 'bg-accent hover:bg-accent/90 text-white'
                    : 'bg-background hover:bg-background/80 text-text-primary border border-border'
                }`}
              >
                {plan.priceValue === 0 ? 'Начать бесплатно' : 'Выбрать'}
              </a>
            </div>
          ))}
        </div>

        {!showFullDetails && (
          <div className="text-center mt-8">
            <Link
              href="/pricing"
              className="text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1"
            >
              Подробное сравнение тарифов
              <span>→</span>
            </Link>
          </div>
        )}

        <p className="text-center text-text-muted text-sm mt-8">
          Подписку можно отменить в любое время. Оплата через App Store / Google Play / RuStore.
        </p>
      </div>
    </section>
  )
}
