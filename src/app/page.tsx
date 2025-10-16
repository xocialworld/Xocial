import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, 
  Calendar, 
  BarChart3, 
  Users, 
  Zap,
  Shield,
  Globe,
  TrendingUp 
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Hero Section */}
      <nav className="border-b border-secondary-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary-600" />
              <span className="text-2xl font-bold text-secondary-900">Xocial</span>
            </div>
            <div className="flex gap-4">
              <Link href="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 mb-8">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">AI-Powered Social Media Management</span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl font-bold text-secondary-900 mb-6">
          Manage All Your Social Media
          <br />
          <span className="text-primary-600">From One Platform</span>
        </h1>
        
        <p className="text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
          Streamline your social media workflow with AI-powered content creation, 
          smart scheduling, and comprehensive analytics across all platforms.
        </p>
        
        <div className="flex gap-4 justify-center mb-16">
          <Link href="/auth/signup">
            <Button size="lg" className="text-lg px-8">
              Start Free Trial
            </Button>
          </Link>
          <Button size="lg" variant="secondary" className="text-lg px-8">
            Watch Demo
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          <Card className="border-2 hover:border-primary-300 transition-all hover:shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">
                Multi-Account Management
              </h3>
              <p className="text-sm text-secondary-600">
                Connect and manage all your social media accounts in one place
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary-300 transition-all hover:shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">
                AI Content Creation
              </h3>
              <p className="text-sm text-secondary-600">
                Generate engaging content with AI-powered suggestions
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary-300 transition-all hover:shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">
                Smart Scheduling
              </h3>
              <p className="text-sm text-secondary-600">
                Plan and schedule posts with visual calendar interface
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary-300 transition-all hover:shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">
                Advanced Analytics
              </h3>
              <p className="text-sm text-secondary-600">
                Track performance with detailed insights and reports
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-secondary-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-secondary-600">
              Powerful features designed for modern social media teams
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-success-600" />
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                Lightning Fast
              </h3>
              <p className="text-secondary-600">
                Optimized performance for seamless workflow
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 bg-info-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-info-600" />
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                Secure & Reliable
              </h3>
              <p className="text-secondary-600">
                Enterprise-grade security for your data
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-warning-600" />
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                Grow Your Reach
              </h3>
              <p className="text-secondary-600">
                Increase engagement across all platforms
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Globe className="h-16 w-16 text-white mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Social Media?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of teams already using Xocial to grow their presence
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Get Started For Free
            </Button>
          </Link>
          <p className="mt-4 text-sm text-primary-100">
            No credit card required • 14-day free trial
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-6 w-6" />
                <span className="text-xl font-bold">Xocial</span>
              </div>
              <p className="text-secondary-400 text-sm">
                AI-powered social media management for modern teams
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Integrations</a></li>
                <li><a href="#" className="hover:text-white">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
                <li><a href="#" className="hover:text-white">Cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-secondary-800 mt-12 pt-8 text-center text-sm text-secondary-400">
            <p>© 2025 Xocial. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

