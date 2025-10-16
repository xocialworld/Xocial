# Xocial Platform

Enterprise-Grade AI-Powered Social Media Management Platform

## 🚀 Features

- **Multi-Account Management (X Page)**: Connect and manage all your social media accounts (Facebook, Instagram, Twitter, LinkedIn, YouTube) in one place
- **Content Calendar (O Page)**: Visual calendar for scheduling and managing posts across all platforms
- **AI Content Creation (C Page)**: AI-powered content generation with customizable tone and platform optimization
- **Analytics & Insights (A Page)**: Comprehensive analytics dashboard with metrics, charts, and performance insights

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: Zustand
- **Charts**: Recharts
- **UI Components**: Custom component library with Lucide icons
- **Deployment**: Vercel

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd xocial-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file based on the `env` file and fill in your credentials.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚀 Deployment

The application is configured for deployment on Vercel:

```bash
vercel
```

## 📱 Key Pages

- `/auth/login` - User authentication
- `/auth/signup` - User registration
- `/x` - Multi-Account Management
- `/o` - Content Calendar
- `/c` - AI Content Creation
- `/a` - Analytics & Insights

## 🔐 Environment Variables

Required environment variables (see `env` file for complete list):

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- Social media API keys (Facebook, Google, etc.)

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. Contact the maintainers for contribution guidelines.

