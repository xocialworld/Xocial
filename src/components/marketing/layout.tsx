import MarketingHeader from './header'
import MarketingFooter from './footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <MarketingHeader />
      <main role="main">{children}</main>
      <MarketingFooter />
    </div>
  )
}

