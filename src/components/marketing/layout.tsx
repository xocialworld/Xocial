import MarketingHeader from './header'
import MarketingFooter from './footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/30 via-white to-secondary-50/30 relative overflow-x-hidden">
      {/* Background decorative elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-gradient-to-br from-primary-200/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-indigo-200/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-gradient-to-r from-purple-200/10 to-transparent rounded-full blur-3xl" />
      </div>

      <MarketingHeader />
      <main role="main" className="pt-16 lg:pt-20">
        {children}
      </main>
      <MarketingFooter />
    </div>
  )
}
