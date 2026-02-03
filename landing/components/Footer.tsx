import Link from 'next/link'
import { SITE_NAME, STORE_LINKS, CONTACT_EMAIL } from '@/lib/constants'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📊</span>
              <span className="font-heading font-bold text-xl text-text-primary">
                {SITE_NAME}
              </span>
            </div>
            <p className="text-text-secondary text-sm max-w-md">
              Мгновенные алерты на изменения цен криптовалют.
              Не пропусти важное движение рынка.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-heading font-semibold text-text-primary mb-4">
              Продукт
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/pricing" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
                  Тарифы
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
                  Контакты
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-heading font-semibold text-text-primary mb-4">
              Документы
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
                  Пользовательское соглашение
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Download Badges */}
        <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-border">
          <a
            href={STORE_LINKS.appStore}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-background hover:bg-background/80 border border-border rounded-lg px-4 py-2 transition-colors"
          >
            <span className="text-xl">🍎</span>
            <div className="text-left">
              <div className="text-[10px] text-text-muted">Загрузите в</div>
              <div className="text-sm font-semibold text-text-primary">App Store</div>
            </div>
          </a>
          <a
            href={STORE_LINKS.googlePlay}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-background hover:bg-background/80 border border-border rounded-lg px-4 py-2 transition-colors"
          >
            <span className="text-xl">▶️</span>
            <div className="text-left">
              <div className="text-[10px] text-text-muted">Доступно в</div>
              <div className="text-sm font-semibold text-text-primary">Google Play</div>
            </div>
          </a>
          <a
            href={STORE_LINKS.ruStore}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-background hover:bg-background/80 border border-border rounded-lg px-4 py-2 transition-colors"
          >
            <span className="text-xl">🇷🇺</span>
            <div className="text-left">
              <div className="text-[10px] text-text-muted">Скачать из</div>
              <div className="text-sm font-semibold text-text-primary">RuStore</div>
            </div>
          </a>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-text-muted text-sm">
            © {currentYear} {SITE_NAME}. Все права защищены.
          </p>
          <p className="text-text-muted text-sm">
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-text-secondary transition-colors">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
