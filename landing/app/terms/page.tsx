import type { Metadata } from 'next'
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Пользовательское соглашение',
  description: `Пользовательское соглашение ${SITE_NAME}. Условия использования приложения и сервиса.`,
}

export default function TermsPage() {
  return (
    <div className="py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-8">
          Пользовательское соглашение
        </h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-text-secondary mb-6">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              1. Описание сервиса
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>
                {SITE_NAME} — это мобильное приложение для мониторинга цен криптовалют
                и получения уведомлений об их изменении.
              </p>
              <p className="font-semibold">
                ВАЖНО: Приложение предоставляет исключительно информационные услуги и
                НЕ является финансовым советом. Мы не рекомендуем совершать какие-либо
                торговые операции на основе данных приложения.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              2. Условия использования
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>Используя приложение, вы подтверждаете, что:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Вам исполнилось 18 лет</li>
                <li>Вы используете только один аккаунт</li>
                <li>Вы не будете использовать приложение в незаконных целях</li>
                <li>Вы понимаете риски, связанные с торговлей криптовалютой</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              3. Подписки и платежи
            </h2>
            <div className="text-text-secondary space-y-3">
              <ul className="list-disc pl-6 space-y-2">
                <li>Подписка продлевается автоматически, если не отменена за 24 часа до окончания периода</li>
                <li>Оплата производится через App Store, Google Play или RuStore</li>
                <li>Возврат средств осуществляется согласно политике соответствующего магазина приложений</li>
                <li>Цены могут изменяться, о чём мы уведомим заранее</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              4. Отказ от ответственности
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>Мы не несём ответственности за:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Финансовые потери, связанные с торговыми решениями</li>
                <li>Задержки или пропуски уведомлений по техническим причинам</li>
                <li>Неточности в данных, полученных от биржи</li>
                <li>Недоступность сервиса по причинам, не зависящим от нас</li>
              </ul>
              <p>
                Приложение предоставляется «как есть» без каких-либо гарантий.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              5. Ограничения
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>Запрещается:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Декомпилировать, дизассемблировать или реверс-инжинирить приложение</li>
                <li>Использовать автоматизированные средства для доступа к сервису</li>
                <li>Распространять приложение или его части без разрешения</li>
                <li>Использовать сервис для нарушения законодательства</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              6. Изменение условий
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>
                Мы оставляем за собой право изменять условия использования.
                О существенных изменениях мы уведомим через приложение или по email
                не менее чем за 14 дней до вступления изменений в силу.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              7. Применимое право
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>
                Настоящее соглашение регулируется законодательством Российской Федерации.
                Все споры разрешаются в соответствии с законодательством РФ.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              8. Контакты
            </h2>
            <div className="text-text-secondary">
              <p>
                По вопросам, связанным с данным соглашением:{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
