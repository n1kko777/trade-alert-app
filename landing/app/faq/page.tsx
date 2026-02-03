import type { Metadata } from 'next'
import FAQ from '@/components/FAQ'
import DownloadBanner from '@/components/DownloadBanner'

export const metadata: Metadata = {
  title: 'FAQ — Часто задаваемые вопросы',
  description: 'Ответы на популярные вопросы о TradePulse Alerts: как работают алерты, подписки, безопасность и многое другое.',
}

export default function FAQPage() {
  return (
    <>
      <div className="pt-8">
        <FAQ showViewAll={false} />
      </div>
      <DownloadBanner />
    </>
  )
}
