import type { Metadata } from 'next'
import Pricing from '@/components/Pricing'
import DownloadBanner from '@/components/DownloadBanner'

export const metadata: Metadata = {
  title: 'Тарифы',
  description: 'Выберите подходящий тариф TradePulse Alerts: Free, Pro, Premium или VIP. 7 дней бесплатный пробный период.',
}

export default function PricingPage() {
  return (
    <>
      <div className="pt-8">
        <Pricing showFullDetails />
      </div>
      <DownloadBanner />
    </>
  )
}
