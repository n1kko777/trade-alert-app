import type { Metadata } from 'next'
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  description: `Политика конфиденциальности ${SITE_NAME}. Узнайте, как мы собираем, используем и защищаем ваши данные.`,
}

export default function PrivacyPage() {
  return (
    <div className="py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-8">
          Политика конфиденциальности
        </h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-text-secondary mb-6">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              1. Какие данные мы собираем
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>При использовании {SITE_NAME} мы можем собирать следующие данные:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Данные аккаунта:</strong> email, имя (при регистрации)</li>
                <li><strong>Данные устройства:</strong> идентификатор устройства для push-уведомлений, модель устройства, версия ОС</li>
                <li><strong>Настройки приложения:</strong> выбранные монеты, пороги алертов, предпочтения уведомлений</li>
                <li><strong>Данные об использовании:</strong> статистика использования функций приложения (опционально)</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              2. Как мы используем данные
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>Собранные данные используются для:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Авторизации и персонализации вашего опыта</li>
                <li>Отправки push-уведомлений об изменениях цен</li>
                <li>Синхронизации настроек между устройствами</li>
                <li>Улучшения качества сервиса</li>
                <li>Технической поддержки</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              3. Кому мы передаём данные
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>Мы можем передавать данные следующим третьим сторонам:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Bybit API:</strong> для получения данных о ценах (передаются только публичные запросы)</li>
                <li><strong>Apple APNs / Google FCM:</strong> для доставки push-уведомлений</li>
                <li><strong>Платёжные провайдеры:</strong> App Store, Google Play, RuStore для обработки подписок</li>
              </ul>
              <p>Мы не продаём ваши персональные данные третьим лицам.</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              4. Хранение и защита данных
            </h2>
            <div className="text-text-secondary space-y-3">
              <ul className="list-disc pl-6 space-y-2">
                <li>Токены авторизации хранятся в зашифрованном виде (SecureStore)</li>
                <li>Данные передаются по защищённому соединению (HTTPS)</li>
                <li>Мы храним данные только столько, сколько необходимо для предоставления сервиса</li>
                <li>При удалении аккаунта все персональные данные удаляются в течение 30 дней</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              5. Ваши права
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>Вы имеете право:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Запросить доступ к своим персональным данным</li>
                <li>Исправить неточные данные</li>
                <li>Удалить свой аккаунт и все связанные данные</li>
                <li>Отозвать согласие на обработку данных</li>
                <li>Отказаться от маркетинговых рассылок</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              6. Файлы cookie
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>
                Веб-версия сайта может использовать файлы cookie для обеспечения работы сайта
                и сбора аналитики. Вы можете отключить cookie в настройках браузера.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              7. Изменения политики
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>
                Мы можем обновлять эту политику конфиденциальности. О существенных изменениях
                мы уведомим через приложение или по email.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              8. Контакты
            </h2>
            <div className="text-text-secondary">
              <p>
                По вопросам конфиденциальности обращайтесь:{' '}
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
