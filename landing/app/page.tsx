import Hero from '@/components/Hero'
import HowItWorks from '@/components/HowItWorks'
import Features from '@/components/Features'
import Pricing from '@/components/Pricing'
import FAQ from '@/components/FAQ'
import DownloadBanner from '@/components/DownloadBanner'

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <FAQ limit={5} />
      <DownloadBanner />
    </>
  )
}
