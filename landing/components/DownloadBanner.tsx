import { STORE_LINKS } from '@/lib/constants'

export default function DownloadBanner() {
  return (
    <section className="py-20 bg-gradient-to-r from-accent/10 via-card to-success/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-4">
          Готовы начать?
        </h2>
        <p className="text-text-secondary text-lg mb-8 max-w-2xl mx-auto">
          Скачайте приложение бесплатно и настройте первый алерт за 30 секунд
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <a
            href={STORE_LINKS.appStore}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 text-white rounded-xl px-6 py-3 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div className="text-left">
              <div className="text-xs opacity-80">Загрузите в</div>
              <div className="text-lg font-semibold">App Store</div>
            </div>
          </a>

          <a
            href={STORE_LINKS.googlePlay}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 text-white rounded-xl px-6 py-3 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.35-4.31c.34.27.54.68.54 1.19 0 .51-.2.92-.54 1.19l-2.01 1.15-2.5-2.5 2.5-2.5 2.01 1.15v.32zm-13.12-8.5l10.76 6.22-2.27 2.27-8.49-8.49z"/>
            </svg>
            <div className="text-left">
              <div className="text-xs opacity-80">Доступно в</div>
              <div className="text-lg font-semibold">Google Play</div>
            </div>
          </a>

          <a
            href={STORE_LINKS.ruStore}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 text-white rounded-xl px-6 py-3 transition-colors"
          >
            <span className="text-3xl">🇷🇺</span>
            <div className="text-left">
              <div className="text-xs opacity-80">Скачать из</div>
              <div className="text-lg font-semibold">RuStore</div>
            </div>
          </a>
        </div>
      </div>
    </section>
  )
}
