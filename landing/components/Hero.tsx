import Link from 'next/link'
import { STORE_LINKS } from '@/lib/constants'
import PhoneMockup from './PhoneMockup'

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-2 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-sm text-text-secondary">Реалтайм мониторинг Bybit</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-text-primary mb-6 leading-tight">
              Не пропусти{' '}
              <span className="text-gradient">движение рынка</span>
            </h1>

            <p className="text-lg sm:text-xl text-text-secondary mb-8 max-w-xl mx-auto lg:mx-0">
              Мгновенные алерты на изменения цен криптовалют Bybit.
              Настрой порог — получай уведомления в реальном времени.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a
                href={STORE_LINKS.appStore}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-center"
              >
                Скачать бесплатно
              </a>
              <Link href="/pricing" className="btn-secondary text-center">
                Посмотреть тарифы
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap gap-6 justify-center lg:justify-start text-text-muted text-sm">
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>Бесплатный старт</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>Без карты</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>Отмена в любой момент</span>
              </div>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="hidden lg:flex justify-center">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
